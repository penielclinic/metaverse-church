import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_ROLES = [
  'pastor', 'school_pastor', 'mission_leader', 'youth_pastor',
  'youth_leader', 'youth_vice_leader', 'youth_secretary', 'school_teacher', 'cell_leader',
]

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('profiles')
    .select('role, mission_id, cell_id')
    .eq('id', user.id)
    .single()
  if (!caller || !ADMIN_ROLES.includes(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const roleFilter = searchParams.get('role') ?? ''

  const admin = createAdminClient()

  // auth.users 에서 마지막 로그인 시각 수집 (service role 전용)
  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const authMap = new Map(
    (authData?.users ?? []).map(u => [u.id, u.last_sign_in_at ?? null])
  )

  // 역할별 조회 범위 제한
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = admin
    .from('profiles')
    .select(`id, name, phone, role, cell_id, created_at, cells ( name ), missions ( name )`)
    .order('name')

  const callerRole = caller.role as string
  if (callerRole === 'cell_leader' || callerRole === 'school_teacher') {
    q = q.eq('cell_id', caller.cell_id)
  } else if (callerRole === 'youth_pastor' || callerRole === 'mission_leader') {
    q = q.eq('mission_id', caller.mission_id)
  } else if (callerRole === 'school_pastor') {
    const { data: m } = await admin.from('missions').select('id').eq('name', '교회학교').single()
    if (m) q = q.eq('mission_id', m.id)
  }

  if (search.trim()) q = q.ilike('name', `%${search.trim()}%`)
  if (roleFilter) q = q.eq('role', roleFilter)

  const { data: profiles } = await q

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const members = (profiles ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    phone: p.phone ?? null,
    role: p.role,
    cellId: p.cell_id ?? null,
    cellName: p.cells?.name ?? null,
    missionName: p.missions?.name ?? null,
    createdAt: p.created_at ?? null,
    lastSignInAt: authMap.get(p.id) ?? null,
  }))

  return NextResponse.json({ members, myRole: caller.role })
}
