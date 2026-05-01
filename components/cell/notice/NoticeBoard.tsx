'use client'

import { useState, useEffect, useCallback } from 'react'

type Notice = {
  id: number
  cell_id: number
  title: string
  content: string
  is_pinned: boolean
  author_id: string
  created_at: string
  author_name?: string
}

interface NoticeBoardProps {
  cellId: string
  isLeader: boolean
}

const LAST_SEEN_KEY = (cellId: string) => `notice_last_seen_${cellId}`

export default function NoticeBoard({ cellId, isLeader }: NoticeBoardProps) {
  const [notices,    setNotices]    = useState<Notice[]>([])
  const [loading,    setLoading]    = useState(true)
  const [newCount,   setNewCount]   = useState(0)
  const [showForm,   setShowForm]   = useState(false)
  const [expanded,   setExpanded]   = useState<number | null>(null)
  const [deleting,   setDeleting]   = useState<number | null>(null)
  const [error,      setError]      = useState('')

  const [title,      setTitle]      = useState('')
  const [content,    setContent]    = useState('')
  const [isPinned,   setIsPinned]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError,  setFormError]  = useState('')

  const fetchNotices = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/cell/notice?cellId=${cellId}&type=notice`)
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? '공지를 불러오지 못했습니다.')
        return
      }
      const data: Notice[] = await res.json()
      setNotices(data)

      const lastSeen = localStorage.getItem(LAST_SEEN_KEY(cellId))
      if (lastSeen) {
        setNewCount(data.filter(n => new Date(n.created_at) > new Date(lastSeen)).length)
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [cellId])

  useEffect(() => { fetchNotices() }, [fetchNotices])

  useEffect(() => {
    localStorage.setItem(LAST_SEEN_KEY(cellId), new Date().toISOString())
    setNewCount(0)
  }, [cellId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) { setFormError('제목과 내용을 모두 입력해주세요.'); return }
    setSubmitting(true); setFormError('')
    try {
      const res = await fetch('/api/cell/notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'notice', cellId, title, content, is_pinned: isPinned }),
      })
      if (!res.ok) { const err = await res.json(); setFormError(err.error ?? '저장 실패'); return }
      setTitle(''); setContent(''); setIsPinned(false); setShowForm(false)
      await fetchNotices()
    } catch {
      setFormError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('이 공지를 삭제하시겠습니까?')) return
    setDeleting(id)
    try {
      await fetch(`/api/cell/notice?id=${id}&type=notice`, { method: 'DELETE' })
      setNotices(prev => prev.filter(n => n.id !== id))
      if (expanded === id) setExpanded(null)
    } finally { setDeleting(null) }
  }

  const sorted = [...notices].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(251,191,36,0.2)' }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(251,191,36,0.1)' }}>
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <h2 className="text-sm font-bold text-amber-200">공지사항</h2>
          {newCount > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
              {newCount > 9 ? '9+' : newCount}
            </span>
          )}
        </div>
        {isLeader && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="text-xs px-3 py-1.5 font-semibold rounded-full transition-colors"
            style={{ background: showForm ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.7)', color: 'white' }}
          >
            {showForm ? '취소' : '+ 새 공지'}
          </button>
        )}
      </div>

      {/* 작성 폼 */}
      {showForm && isLeader && (
        <form onSubmit={handleSubmit} className="px-4 py-3 space-y-2.5" style={{ borderBottom: '1px solid rgba(251,191,36,0.1)', background: 'rgba(99,102,241,0.08)' }}>
          <input
            type="text" placeholder="공지 제목" value={title}
            onChange={e => setTitle(e.target.value)} maxLength={80}
            className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none text-white placeholder-slate-500"
            style={{ background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(99,102,241,0.4)' }}
          />
          <textarea
            placeholder="공지 내용을 입력하세요" value={content}
            onChange={e => setContent(e.target.value)} maxLength={500} rows={3}
            className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none text-white placeholder-slate-500 resize-none"
            style={{ background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(99,102,241,0.4)' }}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-sm text-slate-300 cursor-pointer select-none">
              <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} className="rounded accent-indigo-400" />
              <span className="whitespace-nowrap text-xs">📌 상단 고정</span>
            </label>
            <button type="submit" disabled={submitting}
              className="text-sm px-4 py-1.5 font-semibold rounded-lg disabled:opacity-50 transition-colors"
              style={{ background: 'rgba(99,102,241,0.8)', color: 'white' }}>
              {submitting ? '저장 중…' : '게시'}
            </button>
          </div>
          {formError && <p className="text-xs text-red-400">{formError}</p>}
        </form>
      )}

      {/* 공지 목록 */}
      <div className="divide-y" style={{ borderColor: 'rgba(251,191,36,0.08)' }}>
        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="py-6 text-center">
            <p className="text-sm text-red-400" style={{ wordBreak: 'keep-all' }}>{error}</p>
            <button onClick={fetchNotices} className="mt-2 text-xs text-amber-400 underline">다시 시도</button>
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-3xl mb-2 opacity-30">📋</p>
            <p className="text-sm text-slate-500" style={{ wordBreak: 'keep-all' }}>아직 공지가 없습니다.</p>
            {isLeader && <p className="text-xs text-slate-600 mt-1" style={{ wordBreak: 'keep-all' }}>위의 + 새 공지 버튼으로 작성해보세요.</p>}
          </div>
        ) : (
          sorted.map(notice => (
            <div key={notice.id} style={{ background: notice.is_pinned ? 'rgba(99,102,241,0.08)' : 'transparent' }}>
              <button
                className="w-full flex items-start justify-between gap-2 px-4 py-3 text-left"
                onClick={() => setExpanded(expanded === notice.id ? null : notice.id)}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {notice.is_pinned && <span className="text-indigo-400 flex-shrink-0 text-sm">📌</span>}
                  <span className="text-sm font-semibold text-slate-100 truncate" style={{ wordBreak: 'keep-all' }}>
                    {notice.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-slate-500 whitespace-nowrap">{formatDate(notice.created_at)}</span>
                  <span className={`text-slate-500 text-xs transition-transform ${expanded === notice.id ? 'rotate-180' : ''}`}>▾</span>
                </div>
              </button>

              {expanded === notice.id && (
                <div className="px-4 pb-4 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-sm text-slate-300 leading-relaxed pt-2" style={{ wordBreak: 'keep-all' }}>
                    {notice.content}
                  </p>
                  {notice.author_name && (
                    <p className="text-xs text-slate-500">작성자: <span className="whitespace-nowrap text-slate-400">{notice.author_name}</span></p>
                  )}
                  {isLeader && (
                    <button onClick={() => handleDelete(notice.id)} disabled={deleting === notice.id}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors">
                      {deleting === notice.id ? '삭제 중…' : '삭제'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
