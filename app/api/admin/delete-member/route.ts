import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * DELETE /api/admin/delete-member
 * body: { userId: string }
 * 권한: pastor / elder 만
 */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!caller || !['pastor', 'elder'].includes(caller.role)) {
    return NextResponse.json({ error: '담임목사 또는 장로만 삭제할 수 있습니다.' }, { status: 403 })
  }

  const { userId } = await req.json() as { userId: string }
  if (!userId) return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 })

  // 자기 자신 삭제 방지
  if (userId === user.id) {
    return NextResponse.json({ error: '자기 자신은 삭제할 수 없습니다.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 순장이었다면 cells.leader_id 해제
  await admin.from('cells').update({ leader_id: null }).eq('leader_id', userId)

  // auth.users 삭제 → profiles는 CASCADE로 자동 삭제
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
