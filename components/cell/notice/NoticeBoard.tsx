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
  const [notices, setNotices]       = useState<Notice[]>([])
  const [loading, setLoading]       = useState(true)
  const [newCount, setNewCount]     = useState(0)
  const [showForm, setShowForm]     = useState(false)
  const [expanded, setExpanded]     = useState<number | null>(null)
  const [deleting, setDeleting]     = useState<number | null>(null)

  // 작성 폼 상태
  const [title, setTitle]       = useState('')
  const [content, setContent]   = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')

  // ── 공지 불러오기 ───────────────────────────────────────────
  const fetchNotices = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cell/notice?cellId=${cellId}&type=notice`)
      if (!res.ok) throw new Error()
      const data: Notice[] = await res.json()
      setNotices(data)

      // 새 공지 카운트 — localStorage의 마지막 확인 시각 기준
      const lastSeen = localStorage.getItem(LAST_SEEN_KEY(cellId))
      if (lastSeen) {
        const count = data.filter(
          (n) => new Date(n.created_at) > new Date(lastSeen)
        ).length
        setNewCount(count)
      }
    } catch {
      // 조용히 실패
    } finally {
      setLoading(false)
    }
  }, [cellId])

  useEffect(() => { fetchNotices() }, [fetchNotices])

  // 공지판 열람 시 last-seen 갱신
  useEffect(() => {
    localStorage.setItem(LAST_SEEN_KEY(cellId), new Date().toISOString())
    setNewCount(0)
  }, [cellId])

  // ── 공지 작성 ───────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setFormError('제목과 내용을 모두 입력해주세요.')
      return
    }
    setSubmitting(true)
    setFormError('')
    try {
      const res = await fetch('/api/cell/notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'notice', cellId, title, content, is_pinned: isPinned }),
      })
      if (!res.ok) {
        const err = await res.json()
        setFormError(err.error ?? '저장 실패')
        return
      }
      setTitle('')
      setContent('')
      setIsPinned(false)
      setShowForm(false)
      await fetchNotices()
    } catch {
      setFormError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── 공지 삭제 ───────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!confirm('이 공지를 삭제하시겠습니까?')) return
    setDeleting(id)
    try {
      await fetch(`/api/cell/notice?id=${id}&type=notice`, { method: 'DELETE' })
      setNotices((prev) => prev.filter((n) => n.id !== id))
      if (expanded === id) setExpanded(null)
    } finally {
      setDeleting(null)
    }
  }

  // 핀 고정 공지 위로 정렬
  const sorted = [...notices].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-800">📋 공지사항</h2>
          {newCount > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
              {newCount > 9 ? '9+' : newCount}
            </span>
          )}
        </div>
        {isLeader && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-xs px-3 py-1.5 bg-indigo-600 text-white font-semibold rounded-full hover:bg-indigo-700 transition-colors"
          >
            {showForm ? '취소' : '+ 새 공지'}
          </button>
        )}
      </div>

      {/* 작성 폼 (순장) */}
      {showForm && isLeader && (
        <form
          onSubmit={handleSubmit}
          className="bg-indigo-50 rounded-xl p-4 space-y-3 border border-indigo-100"
        >
          <input
            type="text"
            placeholder="공지 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            className="w-full text-sm border border-indigo-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          />
          <textarea
            placeholder="공지 내용을 입력하세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full text-sm border border-indigo-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white resize-none"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded accent-indigo-600"
              />
              <span className="whitespace-nowrap">📌 상단 고정</span>
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="text-sm px-4 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? '저장 중…' : '게시'}
            </button>
          </div>
          {formError && (
            <p className="text-xs text-red-500">{formError}</p>
          )}
        </form>
      )}

      {/* 공지 목록 */}
      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400">불러오는 중…</div>
      ) : sorted.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400" style={{ wordBreak: 'keep-all' }}>
          아직 공지가 없습니다.
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((notice) => (
            <li
              key={notice.id}
              className={`rounded-xl border transition-colors ${
                notice.is_pinned
                  ? 'border-indigo-200 bg-indigo-50'
                  : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
              }`}
            >
              {/* 공지 헤더 행 */}
              <button
                className="w-full flex items-start justify-between gap-2 px-3.5 py-3 text-left"
                onClick={() => setExpanded(expanded === notice.id ? null : notice.id)}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {notice.is_pinned && (
                    <span className="text-indigo-500 flex-shrink-0 text-sm">📌</span>
                  )}
                  <span
                    className="text-sm font-semibold text-gray-800 truncate"
                    style={{ wordBreak: 'keep-all' }}
                  >
                    {notice.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(notice.created_at)}
                  </span>
                  <span className={`text-gray-400 text-xs transition-transform ${expanded === notice.id ? 'rotate-180' : ''}`}>
                    ▾
                  </span>
                </div>
              </button>

              {/* 펼침 내용 */}
              {expanded === notice.id && (
                <div className="px-3.5 pb-3.5 space-y-2">
                  <p
                    className="text-sm text-gray-700 leading-relaxed"
                    style={{ wordBreak: 'keep-all' }}
                  >
                    {notice.content}
                  </p>
                  {notice.author_name && (
                    <p className="text-xs text-gray-400">
                      작성자: <span className="whitespace-nowrap">{notice.author_name}</span>
                    </p>
                  )}
                  {isLeader && (
                    <button
                      onClick={() => handleDelete(notice.id)}
                      disabled={deleting === notice.id}
                      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                    >
                      {deleting === notice.id ? '삭제 중…' : '삭제'}
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
