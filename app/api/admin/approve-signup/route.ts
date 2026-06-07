import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()

  // 요청자 권한 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const allowed = ['pastor', 'elder']
  if (!me || !allowed.includes(me.role)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const { userId, action, role } = await req.json()
  // action: 'approve' | 'reject'
  // role: 승인 시 부여할 역할 (선택, 기본 'youth')
  // userId: 대상 profiles.id

  if (!userId || !action) {
    return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (action === 'reject') {
    // 거절: auth.users + profiles 삭제
    await admin.from('profiles').delete().eq('id', userId)
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ ok: true })
  }

  if (action === 'approve') {
    const assignedRole = role ?? 'youth'

    // 장로인 경우 장로 소그룹 셀 자동 배정
    let elderCellId: number | null = null
    if (assignedRole === 'elder') {
      const { data: elderCell } = await admin
        .from('cells')
        .select('id')
        .eq('is_elder_group', true)
        .limit(1)
        .single()
      elderCellId = elderCell?.id ?? null
    }

    const { error } = await admin
      .from('profiles')
      .update({
        is_approved: true,
        role: assignedRole,
        ...(elderCellId ? { cell_id: elderCellId } : {}),
      })
      .eq('id', userId)

    if (error) return NextResponse.json({ error: '승인 처리에 실패했습니다.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: '알 수 없는 action입니다.' }, { status: 400 })
}
