'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Status = 'pending' | 'approved' | 'rejected'
type PageTab = 'signups' | 'cell'

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

interface PendingSignup {
  id: string          // profiles.id (UUID)
  name: string
  email: string
  phone: string | null
  role: string
  cellName: string | null
  missionName: string | null
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

const ROLE_OPTIONS = [
  { value: 'youth',            label: '청년' },
  { value: 'young_children',   label: '유년부' },
  { value: 'elementary',       label: '초등부' },
  { value: 'middle_school',    label: '중등부' },
  { value: 'high_school',      label: '고등부' },
  { value: 'elder',            label: '장로' },
  { value: 'cell_leader',      label: '순장' },
  { value: 'mission_leader',   label: '선교회장' },
  { value: 'youth_pastor',     label: '교역자' },
  { value: 'pastor_wife',      label: '목사님사모' },
  { value: 'associate_pastor', label: '부목사님' },
  { value: 'pastor',           label: '담임목사' },
]

export default function RequestsPage() {
  const supabase = createClient()
  const [pageTab, setPageTab] = useState<PageTab>('signups')

  // ── 가입 승인 state ─────────────────────────────────────
  const [signups, setSignups] = useState<PendingSignup[]>([])
  const [signupsLoading, setSignupsLoading] = useState(true)
  const [processingSignup, setProcessingSignup] = useState<string | null>(null)
  const [roleMap, setRoleMap] = useState<Record<string, string>>({}) // userId → 선택 역할

  // ── 순 배치 신청 state ──────────────────────────────────
  const [requests, setRequests] = useState<Request[]>([])
  const [filter, setFilter] = useState<Status | 'all'>('pending')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<number | null>(null)
  const [allowedCellIds, setAllowedCellIds] = useState<number[] | null>(null)

  // ── 권한 계산 ───────────────────────────────────────────
  const [isFullAdmin, setIsFullAdmin] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles').select('role, cell_id, mission_id').eq('id', user.id).single()
      const role = (profile?.role ?? '') as string

      if (role === 'pastor' || role === 'elder') {
        setIsFullAdmin(true)
        setAllowedCellIds(null)
      } else if (role === 'cell_leader' || role === 'school_teacher') {
        setAllowedCellIds(profile?.cell_id ? [profile.cell_id] : [])
      } else if (role === 'school_pastor') {
        const { data: m } = await supabase.from('missions').select('id').eq('name', '교회학교').single()
        const { data: cells } = await supabase.from('cells').select('id').eq('mission_id', m?.id ?? -1)
        setAllowedCellIds(cells?.map((c: { id: number }) => c.id) ?? [])
      } else {
        const { data: cells } = await supabase.from('cells').select('id').eq('mission_id', profile?.mission_id ?? -1)
        setAllowedCellIds(cells?.map((c: { id: number }) => c.id) ?? [])
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 미승인 가입자 로드 ──────────────────────────────────
  const loadSignups = useCallback(async () => {
    setSignupsLoading(true)
    // pending_signups 뷰 사용 (email 포함)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from('pending_signups').select('*').order('created_at', { ascending: false })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = (data ?? []).map((r: any) => ({
      id:          r.id,
      name:        r.name,
      email:       r.email ?? '',
      phone:       r.phone ?? null,
      role:        r.role ?? 'youth',
      cellName:    r.cell_name ?? null,
      missionName: r.mission_name ?? null,
      createdAt:   r.created_at,
    }))
    setSignups(mapped)
    // roleMap을 신청자가 선택한 역할로 초기화
    setRoleMap((prev) => {
      const next = { ...prev }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mapped.forEach((s: any) => { if (!next[s.id]) next[s.id] = s.role })
      return next
    })
    setSignupsLoading(false)
  }, [supabase])

  useEffect(() => {
    if (pageTab === 'signups') loadSignups()
  }, [pageTab, loadSignups])

  const handleSignup = async (userId: string, action: 'approve' | 'reject') => {
    setProcessingSignup(userId)
    const role = roleMap[userId] ?? 'youth'
    await fetch('/api/admin/approve-signup', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action, role }),
    })
    setSignups((prev) => prev.filter((s) => s.id !== userId))
    setProcessingSignup(null)
  }

  // ── 순 배치 신청 로드 ───────────────────────────────────
  const load = useCallback(async () => {
    if (allowedCellIds === undefined) return
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
    if (allowedCellIds !== undefined && pageTab === 'cell') load()
  }, [allowedCellIds, load, pageTab])

  const handle = async (id: number, status: 'approved' | 'rejected') => {
    setProcessing(id)
    const { data: { user } } = await supabase.auth.getUser()

    if (status === 'approved') {
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
      {/* 페이지 탭 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setPageTab('signups')}
          className={[
            'flex-1 py-3 rounded-xl text-sm font-bold transition-all border min-h-[48px]',
            pageTab === 'signups'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400',
          ].join(' ')}
        >
          👤 가입 승인
          {signups.length > 0 && (
            <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {signups.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setPageTab('cell')}
          className={[
            'flex-1 py-3 rounded-xl text-sm font-bold transition-all border min-h-[48px]',
            pageTab === 'cell'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400',
          ].join(' ')}
        >
          📋 순 배치 신청
        </button>
      </div>

      {/* ── 가입 승인 탭 ── */}
      {pageTab === 'signups' && (
        <>
          <h1 className="text-xl font-bold text-gray-800 mb-4">👤 가입 승인 대기</h1>

          {signupsLoading && (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!signupsLoading && signups.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-sm" style={{ wordBreak: 'keep-all' }}>대기 중인 가입 신청이 없습니다.</p>
            </div>
          )}

          <div className="space-y-3">
            {signups.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 text-base whitespace-nowrap">{s.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.email}</p>
                    {s.phone && <p className="text-xs text-gray-500">{s.phone}</p>}
                    {/* 신청자가 선택한 역할·순 */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span className="text-[11px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                        {ROLE_OPTIONS.find((o) => o.value === s.role)?.label ?? s.role}
                      </span>
                      {s.missionName && (
                        <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {s.missionName}
                        </span>
                      )}
                      {s.cellName && (
                        <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {s.cellName}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">{fmt(s.createdAt)}</span>
                </div>

                {/* 역할 선택 (pastor/elder만) */}
                {isFullAdmin && (
                  <div className="mb-3">
                    <label className="text-xs text-gray-500 mb-1 block">역할 지정</label>
                    <select
                      value={roleMap[s.id] ?? 'youth'}
                      onChange={(e) => setRoleMap((prev) => ({ ...prev, [s.id]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[44px]"
                    >
                      {ROLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {(roleMap[s.id] ?? 'youth') === 'elder' && (
                      <p className="text-[11px] text-indigo-600 mt-1" style={{ wordBreak: 'keep-all' }}>
                        ✅ 승인 시 장로 소그룹에 자동으로 배정됩니다
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleSignup(s.id, 'approve')}
                    disabled={processingSignup === s.id}
                    className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all min-h-[44px]"
                  >
                    ✅ 승인
                  </button>
                  <button
                    onClick={() => handleSignup(s.id, 'reject')}
                    disabled={processingSignup === s.id}
                    className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm font-semibold hover:bg-red-100 active:scale-95 disabled:opacity-50 transition-all min-h-[44px]"
                  >
                    ✗ 거절
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── 순 배치 신청 탭 ── */}
      {pageTab === 'cell' && (
        <>
          <h1 className="text-xl font-bold text-gray-800 mb-4">📋 순 배치 신청</h1>

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
        </>
      )}
    </div>
  )
}
