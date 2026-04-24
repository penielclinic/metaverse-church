'use client'

import { useState, useEffect, useCallback } from 'react'

interface JoinRequest {
  id: string
  message: string | null
  status: string
  created_at: string
  profiles: { id: string; name: string; phone: string | null }
}

export default function JoinRequests({ cellId }: { cellId: number }) {
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [done, setDone] = useState<Record<string, 'approved' | 'rejected'>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/cell/join-request?cellId=${cellId}`)
    if (res.ok) {
      const { requests: data } = await res.json()
      setRequests(data ?? [])
    }
    setLoading(false)
  }, [cellId])

  useEffect(() => { load() }, [load])

  const handle = async (requestId: string, action: 'approved' | 'rejected') => {
    setProcessing(requestId)
    const res = await fetch('/api/cell/join-request', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action }),
    })
    if (res.ok) {
      setDone(prev => ({ ...prev, [requestId]: action }))
    }
    setProcessing(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const pending = requests.filter(r => !done[r.id])

  if (pending.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="text-4xl opacity-40">📋</span>
        <p className="text-sm text-slate-400" style={{ wordBreak: 'keep-all' }}>
          대기 중인 순 배치 신청이 없습니다
        </p>
        <button
          onClick={load}
          className="mt-2 px-4 py-2 rounded-full text-xs text-amber-400 border border-amber-400/30 hover:bg-amber-400/10"
        >
          새로고침
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-amber-400/70">총 {pending.length}건 대기 중</p>
        <button
          onClick={load}
          className="text-xs text-slate-500 hover:text-amber-400"
        >
          새로고침
        </button>
      </div>

      {requests.map((req) => {
        const result = done[req.id]
        return (
          <div
            key={req.id}
            className="rounded-2xl p-4"
            style={{
              background: 'rgba(15,23,42,0.6)',
              border: '1px solid rgba(251,191,36,0.15)',
            }}
          >
            {/* 이름 + 날짜 */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-bold text-sm text-amber-100 whitespace-nowrap">
                  {req.profiles?.name ?? '이름 없음'}
                </p>
                {req.profiles?.phone && (
                  <p className="text-xs text-slate-500 mt-0.5 whitespace-nowrap">
                    {req.profiles.phone}
                  </p>
                )}
              </div>
              <span className="text-[10px] text-slate-500 flex-shrink-0 mt-0.5">
                {new Date(req.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* 메시지 */}
            {req.message && (
              <p
                className="text-xs text-slate-300 mb-3 leading-relaxed bg-slate-800/50 rounded-xl px-3 py-2"
                style={{ wordBreak: 'keep-all' }}
              >
                {req.message}
              </p>
            )}

            {/* 버튼 */}
            {result ? (
              <div className={[
                'text-center text-xs font-bold py-2 rounded-xl',
                result === 'approved'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/15 text-red-400',
              ].join(' ')}>
                {result === 'approved' ? '✓ 승인 완료' : '✕ 거절 완료'}
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => handle(req.id, 'rejected')}
                  disabled={!!processing}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-slate-600 text-slate-400 hover:border-red-500/50 hover:text-red-400 disabled:opacity-40 transition-colors min-h-[40px]"
                >
                  {processing === req.id ? '...' : '거절'}
                </button>
                <button
                  onClick={() => handle(req.id, 'approved')}
                  disabled={!!processing}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-opacity min-h-[40px]"
                  style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}
                >
                  {processing === req.id ? '처리 중...' : '승인 →'}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
