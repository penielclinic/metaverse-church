import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/cell/mvp?cellId=1
export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const cellId = Number(searchParams.get('cellId'))
    if (!cellId) return NextResponse.json({ error: 'cellId가 필요합니다.' }, { status: 400 })

    // 가장 최근 세션 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session } = await (supabase as any)
      .from('mvp_sessions')
      .select('*')
      .eq('cell_id', cellId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!session) return NextResponse.json({ session: null, members: [], myVote: null })

    // 해당 셀 순원 목록
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profilesData } = await (supabase as any)
      .from('profiles')
      .select('id, name')
      .eq('cell_id', cellId)

    // 투표 집계
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: votes } = await (supabase as any)
      .from('mvp_votes')
      .select('voter_id, target_id')
      .eq('session_id', session.id)

    // 내 투표
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const myVote = (votes ?? []).find((v: any) => v.voter_id === user.id)?.target_id ?? null

    // 득표 집계
    const voteMap = new Map<string, number>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(votes ?? []).forEach((v: any) => {
      voteMap.set(v.target_id, (voteMap.get(v.target_id) ?? 0) + 1)
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const members = (profilesData ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      voteCount: voteMap.get(p.id) ?? 0,
    }))

    return NextResponse.json({ session, members, myVote })
  } catch (err) {
    console.error('[mvp GET]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST /api/cell/mvp
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const body = await req.json()
    const { action, cellId, sessionId, targetUserId } = body as {
      action: 'create' | 'vote' | 'close'
      cellId: number
      sessionId?: number
      targetUserId?: string
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles').select('role, cell_id').eq('id', user.id).single()

    const isLeader = profile?.role === 'cell_leader' || profile?.role === 'pastor' || profile?.role === 'youth_pastor'

    // ── 투표 생성 ──────────────────────────────────────────────
    if (action === 'create') {
      if (!isLeader) return NextResponse.json({ error: '순장만 투표를 시작할 수 있습니다.' }, { status: 403 })

      // 활성 투표 중복 방지
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from('mvp_sessions').select('id').eq('cell_id', cellId).eq('status', 'active').maybeSingle()
      if (existing) return NextResponse.json({ error: '이미 진행 중인 투표가 있습니다.' }, { status: 409 })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: created, error } = await (supabase as any)
        .from('mvp_sessions')
        .insert({ cell_id: cellId, status: 'active', winner_ids: [], created_by: user.id })
        .select().single()

      if (error) return NextResponse.json({ error: '투표 생성 실패' }, { status: 500 })

      // Realtime broadcast
      const channel = supabase.channel(`cell-mvp-${cellId}`)
      await channel.send({ type: 'broadcast', event: 'vote_update', payload: {} })
      supabase.removeChannel(channel)

      return NextResponse.json({ success: true, session: created })
    }

    // ── 투표 참여 ──────────────────────────────────────────────
    if (action === 'vote') {
      if (!sessionId || !targetUserId) return NextResponse.json({ error: '필수 값 누락' }, { status: 400 })
      if (targetUserId === user.id) return NextResponse.json({ error: '자기 자신에게 투표할 수 없습니다.' }, { status: 400 })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('mvp_votes')
        .insert({ session_id: sessionId, voter_id: user.id, target_id: targetUserId })

      if (error?.code === '23505') return NextResponse.json({ error: '이미 투표하셨습니다.' }, { status: 409 })
      if (error) return NextResponse.json({ error: '투표 실패' }, { status: 500 })

      const channel = supabase.channel(`cell-mvp-${cellId}`)
      await channel.send({ type: 'broadcast', event: 'vote_update', payload: {} })
      supabase.removeChannel(channel)

      return NextResponse.json({ success: true })
    }

    // ── 투표 종료 & MVP 발표 ────────────────────────────────────
    if (action === 'close') {
      if (!isLeader) return NextResponse.json({ error: '순장만 투표를 종료할 수 있습니다.' }, { status: 403 })
      if (!sessionId) return NextResponse.json({ error: 'sessionId 필요' }, { status: 400 })

      // 득표 집계
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: votes } = await (supabase as any)
        .from('mvp_votes').select('target_id').eq('session_id', sessionId)

      const voteMap = new Map<string, number>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(votes ?? []).forEach((v: any) => { voteMap.set(v.target_id, (voteMap.get(v.target_id) ?? 0) + 1) })

      const maxCount = Math.max(...Array.from(voteMap.values()), 0)
      const winnerIds = maxCount > 0
        ? Array.from(voteMap.entries()).filter(([, c]) => c === maxCount).map(([id]) => id)
        : []

      // 세션 closed 처리
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('mvp_sessions')
        .update({ status: 'closed', winner_ids: winnerIds, closed_at: new Date().toISOString() })
        .eq('id', sessionId)

      // winner profiles에 왕관 1주일 부여
      if (winnerIds.length > 0) {
        const crownUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('profiles')
          .update({ has_crown: true, crown_until: crownUntil })
          .in('id', winnerIds)
      }

      const channel = supabase.channel(`cell-mvp-${cellId}`)
      await channel.send({ type: 'broadcast', event: 'vote_closed', payload: { winnerIds } })
      supabase.removeChannel(channel)

      return NextResponse.json({ success: true, winnerIds })
    }

    return NextResponse.json({ error: '알 수 없는 액션' }, { status: 400 })
  } catch (err) {
    console.error('[mvp POST]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
