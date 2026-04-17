'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface MVPSession {
  id: number
  cell_id: number
  status: 'active' | 'closed'
  winner_ids: string[]
  created_by: string
  created_at: string
  closed_at: string | null
}

interface VoteMember {
  id: string
  name: string
  voteCount: number
}

interface MVPVoteProps {
  cellId: number
  myUserId: string
  isLeader: boolean
}

export default function MVPVote({ cellId, myUserId, isLeader }: MVPVoteProps) {
  const [session,     setSession]     = useState<MVPSession | null>(null)
  const [members,     setMembers]     = useState<VoteMember[]>([])
  const [myVote,      setMyVote]      = useState<string | null>(null)  // 내가 투표한 targetUserId
  const [loading,     setLoading]     = useState(true)
  const [voting,      setVoting]      = useState(false)
  const [creating,    setCreating]    = useState(false)
  const [closing,     setClosing]     = useState(false)
  const [showResult,  setShowResult]  = useState(false)

  const supabase = createClient()

  const fetchSession = useCallback(async () => {
    const res = await fetch(`/api/cell/mvp?cellId=${cellId}`)
    if (res.ok) {
      const json = await res.json()
      setSession(json.session ?? null)
      setMembers(json.members ?? [])
      setMyVote(json.myVote ?? null)
      if (json.session?.status === 'closed') setShowResult(true)
    }
    setLoading(false)
  }, [cellId])

  useEffect(() => { fetchSession() }, [fetchSession])

  // Realtime 구독 — 투표 변경 실시간 반영
  useEffect(() => {
    const channel = supabase
      .channel(`cell-mvp-${cellId}`)
      .on('broadcast', { event: 'vote_update' }, () => { fetchSession() })
      .on('broadcast', { event: 'vote_closed' }, () => { fetchSession(); setShowResult(true) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellId, fetchSession])

  const handleCreate = async () => {
    setCreating(true)
    await fetch('/api/cell/mvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', cellId }),
    })
    await fetchSession()
    setCreating(false)
    setShowResult(false)
  }

  const handleVote = async (targetUserId: string) => {
    if (myVote || voting) return
    setVoting(true)
    const res = await fetch('/api/cell/mvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'vote', cellId, sessionId: session?.id, targetUserId }),
    })
    if (res.ok) {
      setMyVote(targetUserId)
      await fetchSession()
    }
    setVoting(false)
  }

  const handleClose = async () => {
    setClosing(true)
    await fetch('/api/cell/mvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close', cellId, sessionId: session?.id }),
    })
    await fetchSession()
    setShowResult(true)
    setClosing(false)
  }

  const maxVotes = Math.max(...members.map(m => m.voteCount), 1)
  const winners = session?.winner_ids ?? []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
        로딩 중...
      </div>
    )
  }

  // 투표 없음 — 순장에게 시작 버튼 표시
  if (!session || session.status === 'closed' && !showResult) {
    return (
      <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">👑</span>
          <h3 className="font-bold text-amber-400 text-sm">이번 주 MVP 투표</h3>
        </div>
        <p className="text-xs text-slate-400" style={{ wordBreak: 'keep-all' }}>
          모임이 끝난 후 순장이 투표를 시작하면 순원들이 서로를 응원해요.
        </p>
        {isLeader && (
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 active:scale-95 transition-all"
          >
            {creating ? '투표 생성 중...' : '👑 이번 주 MVP 투표 시작'}
          </button>
        )}
      </div>
    )
  }

  // 투표 결과 표시
  if (showResult && session.status === 'closed') {
    const winnerMembers = members.filter(m => winners.includes(m.id))
    return (
      <div className="bg-slate-800/60 rounded-2xl p-5 border border-amber-500/30 space-y-4">
        <div className="text-center space-y-1">
          <p className="text-2xl animate-bounce">👑</p>
          <h3 className="font-bold text-amber-400 text-base">이번 주 MVP</h3>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {winnerMembers.map(w => (
              <span key={w.id} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 text-sm font-bold whitespace-nowrap">
                👑 {w.name}
              </span>
            ))}
            {winnerMembers.length === 0 && (
              <span className="text-slate-400 text-sm">투표 결과 없음</span>
            )}
          </div>
        </div>

        {/* 득표 바 차트 */}
        <div className="space-y-2">
          {[...members].sort((a, b) => b.voteCount - a.voteCount).map(m => {
            const isWinner = winners.includes(m.id)
            return (
              <div key={m.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium whitespace-nowrap ${isWinner ? 'text-amber-400' : 'text-slate-300'}`}>
                    {isWinner && '👑 '}{m.name}
                  </span>
                  <span className="text-slate-400">{m.voteCount}표</span>
                </div>
                <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-700 ${isWinner ? 'bg-amber-400' : 'bg-slate-500'}`}
                    style={{ width: `${(m.voteCount / maxVotes) * 100}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {isLeader && (
          <button onClick={handleCreate} disabled={creating}
            className="w-full py-2 rounded-xl text-xs font-bold text-slate-400 border border-slate-600 hover:border-amber-500/50 hover:text-amber-400 transition-colors disabled:opacity-50">
            {creating ? '생성 중...' : '다음 주 투표 시작'}
          </button>
        )}
      </div>
    )
  }

  // 활성 투표 — 투표 UI
  return (
    <div className="bg-slate-800/60 rounded-2xl p-5 border border-amber-500/20 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">👑</span>
          <div>
            <h3 className="font-bold text-amber-400 text-sm">이번 주 은혜의 한 마디</h3>
            <p className="text-xs text-slate-400">익명 투표 · 1인 1표</p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-green-900/50 text-green-400 border border-green-700/50 font-semibold">
          투표 중
        </span>
      </div>

      {myVote && (
        <p className="text-xs text-emerald-400 font-medium text-center py-1 rounded-lg bg-emerald-900/20 border border-emerald-700/30">
          ✅ 투표 완료! 결과는 순장이 발표할 때 공개돼요.
        </p>
      )}

      {/* 순원 투표 목록 */}
      <ul className="space-y-2">
        {members.filter(m => m.id !== myUserId).map(m => {
          const voted = myVote === m.id
          return (
            <li key={m.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-amber-300 flex-shrink-0">
                {m.name.slice(0, 1)}
              </div>
              <span className="flex-1 text-sm font-medium text-slate-200 whitespace-nowrap">{m.name}</span>
              <button
                onClick={() => handleVote(m.id)}
                disabled={!!myVote || voting}
                className={[
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  voted
                    ? 'bg-amber-400/20 text-amber-400 border border-amber-400/50 cursor-default'
                    : myVote
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-700 text-slate-300 hover:bg-amber-400/20 hover:text-amber-400 hover:border-amber-400/50 border border-transparent active:scale-95',
                ].join(' ')}
              >
                {voted ? '✅ 선택됨' : '👑 투표'}
              </button>
            </li>
          )
        })}
      </ul>

      {isLeader && (
        <button onClick={handleClose} disabled={closing}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 active:scale-95 transition-all">
          {closing ? '집계 중...' : '🏆 투표 종료 & MVP 발표'}
        </button>
      )}
    </div>
  )
}
