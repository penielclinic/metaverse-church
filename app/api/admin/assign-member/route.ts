import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * PATCH /api/admin/assign-member
 * body: { userId: string, role: string, cellId: number | null }
 *
 * 호출 권한: pastor / youth_pastor 만
 * 처리:
 *   1. profiles.role + profiles.cell_id 업데이트
 *   2. cell_leader 임명 시 → cells.leader_id = userId
 *   3. cell_leader 해제 시 → cells.leader_id = null (해당 셀만)
 */
export async function PATCH(req: NextRequest) {
  // 호출자 검증 (anon key + 세션)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!caller || !['pastor', 'youth_pastor'].includes(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, role, cellId } = await req.json() as {
    userId: string
    role: string
    cellId: number | null
  }
  if (!userId || !role) {
    return NextResponse.json({ error: 'userId와 role은 필수입니다.' }, { status: 400 })
  }

  // service role 클라이언트 (RLS 우회)
  const admin = createAdminClient()

  // 1. 프로필 업데이트
  const { error: profileErr } = await admin
    .from('profiles')
    .update({ role, cell_id: cellId ?? null })
    .eq('id', userId)
  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })

  // 2. cells.leader_id 동기화
  if (role === 'cell_leader' && cellId) {
    // 해당 사용자가 다른 셀의 순장이었다면 해제
    await admin.from('cells').update({ leader_id: null }).eq('leader_id', userId)
    // 새 셀의 순장으로 지정
    const { error: cellErr } = await admin
      .from('cells').update({ leader_id: userId }).eq('id', cellId)
    if (cellErr) return NextResponse.json({ error: cellErr.message }, { status: 500 })
  } else {
    // cell_leader가 아닌 역할로 변경 시 순장 자리 해제
    await admin.from('cells').update({ leader_id: null }).eq('leader_id', userId)
  }

  return NextResponse.json({ ok: true })
}
