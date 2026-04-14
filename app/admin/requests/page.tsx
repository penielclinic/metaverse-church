'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Status = 'pending' | 'approved' | 'rejected'

interface Request {
  id: number
  userId: string
  userName: string
  cellId: number
  cellName: string
  missionName: string
  message: string | null
  status: Status
  createdAt: string
}

const STATUS_LABEL: Record<Status, string> = {
  pending: '대기',
  approved: '승인',
  rejected: '거절',
}
const STATUS_COLOR: Record<Status, string> = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

export default function RequestsPage() {
  const supabase = createClient()
  const [requests, setRequests] = useState<Request[]>([])
  const [filter, setFilter] = useState<Status | 'all'>('pending')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<number | null>(null)
  const [allowedCellIds, setAllowedCellIds] = useState<number[] | null>(null) // null = 전체

  // 역할별 접근 가능 셀 ID 계산
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles').select('role, cell_id, mission_id').eq('id', user.id).single()
      const role = (profile?.role ?? '') as string

      if (role === 'pastor') {
        setAllowedCellIds(null) // 전체
      } else if (role === 'cell_leader' || role === 'school_teacher') {
        setAllowedCellIds(profile?.cell_id ? [profile.cell_id] : [])
      } else if (role === 'school_pastor') {
        const { data: m } = await supabase.from('missions').select('id').eq('name', '교회학교').single()
        const { data: cells } = await supabase.from('cells').select('id').eq('mission_id', m?.id ?? -1)
        setAllowedCellIds(cells?.map((c: { id: number }) => c.id) ?? [])
      } else {
        // youth_pastor, mission_leader → 소속 mission의 셀
        const { data: cells } = await supabase.from('cells').select('id').eq('mission_id', profile?.mission_id ?? -1)
        setAllowedCellIds(cells?.map((c: { id: number }) => c.id) ?? [])
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = useCallback(async () => {
    if (allowedCellIds === undefined) return // 초기화 전
    setLoading(true)

    let q = supabase
      .from('cell_join_requests')
      .select(`
        id, user_id, cell_id, message, status, created_at,
        profiles!cell_join_requests_user_id_fkey ( name ),
        cells ( name, missions ( name ) )
      `)
      .order('created_at', { ascending: false })

    if (filter !== 'all') q = q.eq('status', filter)
    if (allowedCellIds !== null) {
      q = q.in('cell_id', allowedCellIds.length ? allowedCellIds : [-1])
    }

    const { data } = await q
    setRequests(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data ?? []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        userName: r.profiles?.name ?? '(알 수 없음)',
        cellId: r.cell_id,
        cellName: r.cells?.name ?? '',
        missionName: r.cells?.missions?.name ?? '',
        message: r.message,
        status: r.status as Status,
        createdAt: r.created_at,
      }))
    )
    setLoading(false)
  }, [allowedCellIds, filter, supabase])

  useEffect(() => {
    if (allowedCellIds !== undefined) load()
  }, [allowedCellIds, load])

  const handle = async (id: number, status: 'approved' | 'rejected') => {
    setProcessing(id)
    const { data: { user } } = await supabase.auth.getUser()

    if (status === 'approved') {
      // 신청 승인 → profiles.cell_id 업데이트
      const req = requests.find((r) => r.id === id)
      if (req) {
        await supabase.from('profiles').update({ cell_id: req.cellId }).eq('id', req.userId)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('cell_join_requests') as any)
      .update({ status, reviewed_by: user?.id, updated_at: new Date().toISOString() })
      .eq('id', id)

    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r))
    setProcessing(null)
  }

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="px-4 py-6 max-w-screen-md mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-4">📋 순 배치 신청</h1>

      {/* 필터 탭 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={[
              'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border',
              filter === s
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400',
            ].join(' ')}
          >
            {s === 'all' ? '전체' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && requests.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm" style={{ wordBreak: 'keep-all' }}>
            {filter === 'pending' ? '처리할 신청이 없습니다.' : '신청 내역이 없습니다.'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {requests.map((req) => (
          <div key={req.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-800 text-sm whitespace-nowrap">{req.userName}</span>
                  <span className={['text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', STATUS_COLOR[req.status]].join(' ')}>
                    {STATUS_LABEL[req.status]}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-xs text-indigo-600 font-medium whitespace-nowrap">{req.cellName}</span>
                  {req.missionName && (
                    <span className="text-xs text-gray-400 whitespace-nowrap">· {req.missionName}</span>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">{fmt(req.createdAt)}</span>
            </div>

            {req.message && (
              <p className="text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-2 mb-3" style={{ wordBreak: 'keep-all' }}>
                💬 {req.message}
              </p>
            )}

            {req.status === 'pending' && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handle(req.id, 'approved')}
                  disabled={processing === req.id}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all min-h-[44px]"
                >
                  ✅ 승인
                </button>
                <button
                  onClick={() => handle(req.id, 'rejected')}
                  disabled={processing === req.id}
                  className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm font-semibold hover:bg-red-100 active:scale-95 disabled:opacity-50 transition-all min-h-[44px]"
                >
                  ✗ 거절
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
