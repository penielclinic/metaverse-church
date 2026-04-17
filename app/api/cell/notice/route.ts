import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 공지/일정 작성이 허용된 역할
const WRITER_ROLES = ['cell_leader', 'mission_leader', 'pastor', 'youth_pastor']

// ── GET /api/cell/notice ────────────────────────────────────────
// ?cellId=<id>&type=notice|schedule   (type 생략 시 둘 다)
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cellId = searchParams.get('cellId')
    const type   = searchParams.get('type') // 'notice' | 'schedule' | null

    if (!cellId) {
      return NextResponse.json({ error: 'cellId가 필요합니다.' }, { status: 400 })
    }

    // 해당 셀에 접근 권한 확인 (소속 셀원 또는 pastor/youth_pastor)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, cell_id')
      .eq('id', user.id)
      .single()

    const role   = (profile as { role: string; cell_id: number | null } | null)?.role ?? ''
    const userCellId = (profile as { role: string; cell_id: number | null } | null)?.cell_id

    const isPastor = role === 'pastor' || role === 'youth_pastor' || role === 'mission_leader'
    if (!isPastor && String(userCellId) !== cellId) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 })
    }

    if (!type || type === 'notice') {
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('cell_notices' as any)
        .select('id, cell_id, title, content, is_pinned, author_id, created_at, profiles(name)')
        .eq('cell_id', cellId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: '조회 실패' }, { status: 500 })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const notices = (data as any[]).map((n) => ({
        ...n,
        author_name: n.profiles?.name ?? null,
        profiles: undefined,
      }))

      if (type === 'notice') return NextResponse.json(notices)
      if (!type) {
        const { data: schedData, error: schedErr } = await supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from('cell_schedules' as any)
          .select('*')
          .eq('cell_id', cellId)
          .order('scheduled_at', { ascending: true })

        if (schedErr) return NextResponse.json({ error: '조회 실패' }, { status: 500 })
        return NextResponse.json({ notices, schedules: schedData })
      }
    }

    if (type === 'schedule') {
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('cell_schedules' as any)
        .select('*')
        .eq('cell_id', cellId)
        .order('scheduled_at', { ascending: true })

      if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: '잘못된 type 값입니다.' }, { status: 400 })
  } catch (err) {
    console.error('[cell/notice GET]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// ── POST /api/cell/notice ───────────────────────────────────────
// body: { type: 'notice'|'schedule', cellId, ...fields }
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 역할 + 소속 셀 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, cell_id')
      .eq('id', user.id)
      .single()

    const role   = (profile as { role: string; cell_id: number | null } | null)?.role ?? ''
    const userCellId = (profile as { role: string; cell_id: number | null } | null)?.cell_id

    if (!WRITER_ROLES.includes(role)) {
      return NextResponse.json({ error: '작성 권한이 없습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { type, cellId } = body

    if (!cellId || !type) {
      return NextResponse.json({ error: 'cellId와 type이 필요합니다.' }, { status: 400 })
    }

    // cell_leader는 자신의 셀만 관리 가능
    const isPastor = role === 'pastor' || role === 'youth_pastor'
    if (!isPastor && role === 'cell_leader' && String(userCellId) !== String(cellId)) {
      return NextResponse.json({ error: '자신의 셀 공지만 작성할 수 있습니다.' }, { status: 403 })
    }

    if (type === 'notice') {
      const { title, content, is_pinned } = body

      if (!title?.trim() || !content?.trim()) {
        return NextResponse.json({ error: '제목과 내용을 입력해주세요.' }, { status: 400 })
      }
      if (title.length > 80 || content.length > 500) {
        return NextResponse.json({ error: '제목 80자, 내용 500자 이내로 입력해주세요.' }, { status: 400 })
      }

      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('cell_notices' as any)
        .insert({
          cell_id: Number(cellId),
          title: title.trim(),
          content: content.trim(),
          is_pinned: Boolean(is_pinned),
          author_id: user.id,
        })
        .select('id')
        .single()

      if (error) {
        console.error('[cell/notice POST notice]', error)
        return NextResponse.json({ error: '저장 실패' }, { status: 500 })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return NextResponse.json({ id: (data as any).id }, { status: 201 })
    }

    if (type === 'schedule') {
      const { title, scheduled_at, location, description, schedule_type } = body

      if (!title?.trim() || !scheduled_at) {
        return NextResponse.json({ error: '제목과 일정 날짜를 입력해주세요.' }, { status: 400 })
      }

      const parsedDate = new Date(scheduled_at)
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: '유효하지 않은 날짜입니다.' }, { status: 400 })
      }

      const validTypes = ['regular', 'special']
      const resolvedType = validTypes.includes(schedule_type) ? schedule_type : 'regular'

      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('cell_schedules' as any)
        .insert({
          cell_id: Number(cellId),
          title: title.trim(),
          scheduled_at: parsedDate.toISOString(),
          location: location?.trim() || null,
          description: description?.trim() || null,
          type: resolvedType,
        })
        .select('id')
        .single()

      if (error) {
        console.error('[cell/notice POST schedule]', error)
        return NextResponse.json({ error: '저장 실패' }, { status: 500 })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return NextResponse.json({ id: (data as any).id }, { status: 201 })
    }

    return NextResponse.json({ error: '잘못된 type 값입니다.' }, { status: 400 })
  } catch (err) {
    console.error('[cell/notice POST]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// ── DELETE /api/cell/notice ─────────────────────────────────────
// ?id=<id>&type=notice|schedule
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, cell_id')
      .eq('id', user.id)
      .single()

    const role   = (profile as { role: string; cell_id: number | null } | null)?.role ?? ''
    if (!WRITER_ROLES.includes(role)) {
      return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id   = searchParams.get('id')
    const type = searchParams.get('type')

    if (!id || !type) {
      return NextResponse.json({ error: 'id와 type이 필요합니다.' }, { status: 400 })
    }

    const table = type === 'notice' ? 'cell_notices' : type === 'schedule' ? 'cell_schedules' : null
    if (!table) {
      return NextResponse.json({ error: '잘못된 type 값입니다.' }, { status: 400 })
    }

    const isPastor = role === 'pastor' || role === 'youth_pastor'
    const userCellId = (profile as { role: string; cell_id: number | null } | null)?.cell_id

    // cell_leader: 자신의 셀 레코드만 삭제 가능
    let query = supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from(table as any)
      .delete()
      .eq('id', Number(id))

    if (!isPastor && role === 'cell_leader') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).eq('cell_id', userCellId)
    }

    const { error } = await query

    if (error) {
      console.error('[cell/notice DELETE]', error)
      return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[cell/notice DELETE]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
