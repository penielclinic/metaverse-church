import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/cell/prayer?cellId=1
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const cellId = Number(searchParams.get('cellId'))

    if (!cellId) {
      return NextResponse.json({ error: 'cellId가 필요합니다.' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('cell_prayer_requests')
      .select(`
        id, cell_id, user_id, content, color, amen_count, is_answered, created_at,
        profiles:user_id ( name ),
        cell_prayer_amens!inner ( user_id )
      `)
      .eq('cell_id', cellId)
      .order('created_at', { ascending: false })

    if (error) {
      // inner join이 없는 경우도 처리 (아멘 없는 카드)
      const { data: data2, error: error2 } = await supabase
        .from('cell_prayer_requests')
        .select(`
          id, cell_id, user_id, content, color, amen_count, is_answered, created_at,
          profiles:user_id ( name )
        `)
        .eq('cell_id', cellId)
        .order('created_at', { ascending: false })

      if (error2) {
        console.error('[cell/prayer GET]', error2)
        return NextResponse.json({ error: '조회 실패' }, { status: 500 })
      }

      // 내가 아멘한 목록 별도 조회
      const ids = (data2 ?? []).map((r) => r.id)
      const { data: myAmens } = ids.length
        ? await supabase
            .from('cell_prayer_amens')
            .select('request_id')
            .eq('user_id', user.id)
            .in('request_id', ids)
        : { data: [] }

      const amenedSet = new Set((myAmens ?? []).map((a) => a.request_id))

      const result = (data2 ?? []).map((r) => ({
        ...r,
        isAmenedByMe: amenedSet.has(r.id),
        authorName: (r.profiles as { name: string } | null)?.name ?? '순원',
        isMyOwn: r.user_id === user.id,
      }))

      return NextResponse.json({ data: result })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[cell/prayer GET] unexpected:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST /api/cell/prayer — 기도제목 추가
export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await req.json()
    const cellId: number | undefined = body.cellId
    const content: string = (body.content ?? '').trim()
    const color: string = body.color ?? 'yellow'

    const validColors = ['yellow', 'blue', 'green', 'pink']
    if (!cellId) {
      return NextResponse.json({ error: 'cellId가 필요합니다.' }, { status: 400 })
    }
    if (!content || content.length > 200) {
      return NextResponse.json({ error: '기도제목을 1~200자로 입력해주세요.' }, { status: 400 })
    }
    if (!validColors.includes(color)) {
      return NextResponse.json({ error: '올바른 색상을 선택해주세요.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('cell_prayer_requests')
      .insert({ cell_id: cellId, user_id: user.id, content, color })
      .select()
      .single()

    if (error) {
      console.error('[cell/prayer POST]', error)
      return NextResponse.json({ error: '저장 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (err) {
    console.error('[cell/prayer POST] unexpected:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// PATCH /api/cell/prayer — 아멘 토글 또는 완료 체크
export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await req.json()
    const requestId: number | undefined = body.requestId
    const action: 'amen' | 'answered' = body.action

    if (!requestId || !action) {
      return NextResponse.json({ error: 'requestId와 action이 필요합니다.' }, { status: 400 })
    }

    if (action === 'amen') {
      // 아멘 토글
      const { data: existing } = await supabase
        .from('cell_prayer_amens')
        .select('id')
        .eq('request_id', requestId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        // 아멘 취소
        await supabase
          .from('cell_prayer_amens')
          .delete()
          .eq('id', existing.id)

        await supabase.rpc('decrement_prayer_amen', { p_request_id: requestId })

        return NextResponse.json({ success: true, amened: false })
      } else {
        // 아멘 추가
        await supabase
          .from('cell_prayer_amens')
          .insert({ request_id: requestId, user_id: user.id })

        await supabase.rpc('increment_prayer_amen', { p_request_id: requestId })

        // 기도제목 작성자 정보 조회 (알림톡 발송용)
        const { data: prayerReq } = await supabase
          .from('cell_prayer_requests')
          .select('user_id, content, amen_count, profiles:user_id ( name )')
          .eq('id', requestId)
          .single()

        // NHN Cloud 알림톡은 별도 서비스에서 처리 (서버 사이드에서만 가능)
        if (prayerReq && prayerReq.user_id !== user.id) {
          // TODO: 알림톡 발송 — /api/notification/kakao 엔드포인트 호출
          // await fetch('/api/notification/kakao', { method: 'POST', body: ... })
        }

        return NextResponse.json({ success: true, amened: true })
      }
    }

    if (action === 'answered') {
      // 완료 토글 (본인만)
      const { data: prayerReq } = await supabase
        .from('cell_prayer_requests')
        .select('user_id, is_answered')
        .eq('id', requestId)
        .single()

      if (!prayerReq || prayerReq.user_id !== user.id) {
        return NextResponse.json({ error: '본인 기도제목만 수정할 수 있습니다.' }, { status: 403 })
      }

      const { error } = await supabase
        .from('cell_prayer_requests')
        .update({ is_answered: !prayerReq.is_answered })
        .eq('id', requestId)

      if (error) {
        return NextResponse.json({ error: '업데이트 실패' }, { status: 500 })
      }

      return NextResponse.json({ success: true, isAnswered: !prayerReq.is_answered })
    }

    return NextResponse.json({ error: '알 수 없는 action' }, { status: 400 })
  } catch (err) {
    console.error('[cell/prayer PATCH] unexpected:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// DELETE /api/cell/prayer?id=1
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))

    if (!id) {
      return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 본인 확인
    const { data: prayerReq } = await supabase
      .from('cell_prayer_requests')
      .select('user_id, cell_id')
      .eq('id', id)
      .single()

    if (!prayerReq) {
      return NextResponse.json({ error: '기도제목을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 본인 또는 순장/pastor만 삭제 가능
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, cell_id')
      .eq('id', user.id)
      .single()

    const canDelete =
      prayerReq.user_id === user.id ||
      profile?.role === 'pastor' ||
      profile?.role === 'youth_pastor' ||
      (profile?.role === 'cell_leader' && profile?.cell_id === prayerReq.cell_id)

    if (!canDelete) {
      return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 })
    }

    const { error } = await supabase
      .from('cell_prayer_requests')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[cell/prayer DELETE]', error)
      return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[cell/prayer DELETE] unexpected:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
