import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type AttendanceStatus = 'present' | 'absent' | 'late'

// ────────────────────────────────────────────────────────────
// GET /api/cell/attendance?cellId=1&date=2026-04-16
// ────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const cellId = Number(searchParams.get('cellId'))
    const date   = searchParams.get('date') ?? new Date().toISOString().slice(0, 10)

    if (!cellId) {
      return NextResponse.json({ error: 'cellId가 필요합니다.' }, { status: 400 })
    }

    // 해당 셀 출석 로그 + 프로필 조인
    const { data: logs, error } = await supabase
      .from('attendance_logs' as never)
      .select('id, user_id, status, date, profiles(name)' as never)
      .eq('cell_id', cellId as never)
      .eq('date', date as never)

    if (error) {
      console.error('[attendance GET]', error)
      return NextResponse.json({ error: '조회 실패' }, { status: 500 })
    }

    return NextResponse.json({ logs: logs ?? [], date, cellId })
  } catch (err) {
    console.error('[attendance GET]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// ────────────────────────────────────────────────────────────
// POST /api/cell/attendance
// body: { userId, cellId, status, date }
// ────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 순장·목사만 출석 체크 가능
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('role, cell_id')
      .eq('id', user.id)
      .single()

    const isLeader =
      myProfile?.role === 'cell_leader' ||
      myProfile?.role === 'pastor' ||
      myProfile?.role === 'youth_pastor'

    if (!isLeader) {
      return NextResponse.json({ error: '순장만 출석을 기록할 수 있습니다.' }, { status: 403 })
    }

    const body = await req.json()
    const { userId, cellId, status, date } = body as {
      userId: string
      cellId: number
      status: AttendanceStatus
      date: string
    }

    if (!userId || !cellId || !status || !date) {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 })
    }

    const validStatuses: AttendanceStatus[] = ['present', 'absent', 'late']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: '유효하지 않은 상태값입니다.' }, { status: 400 })
    }

    // UPSERT — 같은 날짜·유저·셀 중복 방지
    const { error: upsertError } = await supabase
      .from('attendance_logs' as never)
      .upsert(
        { cell_id: cellId, user_id: userId, date, status } as never,
        { onConflict: 'cell_id,user_id,date' }
      )

    if (upsertError) {
      console.error('[attendance POST upsert]', upsertError)
      return NextResponse.json({ error: '저장 실패' }, { status: 500 })
    }

    // ── 순보고 연동: attendance_total 업데이트 ─────────────────
    // profiles.attendance_total = 해당 셀·유저의 전체 출석(present) 횟수
    const { count } = await supabase
      .from('attendance_logs' as never)
      .select('id', { count: 'exact', head: true })
      .eq('cell_id', cellId as never)
      .eq('user_id', userId as never)
      .eq('status', 'present' as never)

    if (count !== null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('profiles') as any)
        .update({ attendance_total: count })
        .eq('id', userId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[attendance POST]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
