import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/cell/join-request?cellId=X — 순장용 신청 목록
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cellId = req.nextUrl.searchParams.get('cellId')
  if (!cellId) return NextResponse.json({ error: 'cellId required' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('cell_join_requests') as any)
    .select('id, message, status, created_at, profiles!cell_join_requests_user_id_fkey(id, name, phone)')
    .eq('cell_id', Number(cellId))
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data ?? [] })
}

// PATCH /api/cell/join-request — 승인 or 거절
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { requestId, action } = await req.json() as { requestId: string; action: 'approved' | 'rejected' }
  if (!requestId || !['approved', 'rejected'].includes(action)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  // 신청 정보 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: reqRow, error: fetchErr } = await (supabase.from('cell_join_requests') as any)
    .select('user_id, cell_id, status')
    .eq('id', requestId)
    .single()

  if (fetchErr || !reqRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (reqRow.status !== 'pending') return NextResponse.json({ error: 'Already reviewed' }, { status: 409 })

  // 상태 업데이트
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (supabase.from('cell_join_requests') as any)
    .update({ status: action, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', requestId)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // 승인이면 profiles.cell_id 업데이트
  if (action === 'approved') {
    await supabase.from('profiles')
      .update({ cell_id: reqRow.cell_id })
      .eq('id', reqRow.user_id)
  }

  return NextResponse.json({ ok: true })
}
