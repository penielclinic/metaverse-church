'use client'

import { useState } from 'react'

export interface DevotionCardData {
  id: number
  authorName: string
  authorId: string
  bibleRef: string
  content: string
  createdAt: string
  loggedDate?: string
  amenCount: number
  isAmenedByMe: boolean
  isMyOwn: boolean
}

interface Comment {
  id: number
  content: string
  createdAt: string
  userId: string
  authorName: string
}

interface DevotionCardProps extends DevotionCardData {
  onAmen: (id: number) => void
  amenLoadingId: number | null
}

export default function DevotionCard({
  id,
  authorName,
  bibleRef,
  content,
  createdAt,
  amenCount,
  isAmenedByMe,
  isMyOwn,
  onAmen,
  amenLoadingId,
}: DevotionCardProps) {
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [posting, setPosting] = useState(false)

  const time = new Date(createdAt).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const isLoading = amenLoadingId === id

  const initials = authorName.slice(0, 1)
  const colors = [
    'bg-indigo-100 text-indigo-600',
    'bg-purple-100 text-purple-600',
    'bg-pink-100 text-pink-600',
    'bg-teal-100 text-teal-600',
    'bg-amber-100 text-amber-600',
  ]
  const colorClass = colors[authorName.charCodeAt(0) % colors.length]

  async function loadComments() {
    setLoadingComments(true)
    try {
      const res = await fetch(`/api/devotion/comment?devotionId=${id}`)
      const data = await res.json()
      setComments(data.comments ?? [])
    } catch { /* ignore */ }
    setLoadingComments(false)
  }

  async function toggleComments() {
    if (!showComments) {
      await loadComments()
    }
    setShowComments(!showComments)
  }

  async function postComment() {
    if (!commentText.trim()) return
    setPosting(true)
    try {
      await fetch('/api/devotion/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devotionId: id, content: commentText.trim() }),
      })
      setCommentText('')
      await loadComments()
    } catch { /* ignore */ }
    setPosting(false)
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow">
      {/* 작성자 헤더 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${colorClass}`}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800 whitespace-nowrap">
              {authorName}
              {isMyOwn && (
                <span className="ml-1.5 text-[10px] font-semibold text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                  나
                </span>
              )}
            </p>
            <p className="text-[11px] text-gray-400">{time}</p>
          </div>
        </div>

        <span className="flex-shrink-0 text-xs bg-indigo-50 text-indigo-600 font-semibold px-2.5 py-1 rounded-full whitespace-nowrap max-w-[140px] truncate">
          {bibleRef}
        </span>
      </div>

      {/* 묵상 내용 */}
      <p
        className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap"
        style={{ wordBreak: 'keep-all' }}
      >
        {content}
      </p>

      {/* 아멘 + 댓글 버튼 */}
      <div className="flex items-center justify-between pt-0.5">
        <button
          onClick={toggleComments}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          💬 댓글 {comments.length > 0 ? comments.length : ''}
        </button>
        <button
          onClick={() => !isMyOwn && !isLoading && onAmen(id)}
          disabled={isMyOwn || isLoading}
          aria-label={isAmenedByMe ? '아멘 취소' : '아멘'}
          className={[
            'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-bold transition-all',
            isMyOwn
              ? 'text-gray-300 cursor-default select-none'
              : isLoading
              ? 'bg-gray-100 text-gray-400 cursor-wait'
              : isAmenedByMe
              ? 'bg-indigo-600 text-white shadow active:scale-95'
              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95',
          ].join(' ')}
        >
          {isLoading ? (
            <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>🙏</span>
          )}
          <span>아멘{amenCount > 0 ? ` ${amenCount}` : ''}</span>
        </button>
      </div>

      {/* 댓글 섹션 */}
      {showComments && (
        <div className="border-t border-gray-100 pt-3 space-y-2">
          {loadingComments ? (
            <p className="text-xs text-gray-400 text-center py-2">댓글 불러오는 중...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-1">아직 댓글이 없습니다</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
                  {c.authorName.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">{c.authorName}</span>
                    <span className="text-[10px] text-gray-300">
                      {new Date(c.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5" style={{ wordBreak: 'keep-all' }}>{c.content}</p>
                </div>
              </div>
            ))
          )}

          {/* 댓글 입력 */}
          <div className="flex gap-2 mt-1">
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), postComment())}
              placeholder="댓글을 남겨보세요"
              className="flex-1 text-xs px-3 py-2 rounded-full bg-gray-50 border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
            <button
              onClick={postComment}
              disabled={posting || !commentText.trim()}
              className="text-xs px-3 py-2 rounded-full bg-indigo-500 text-white font-semibold disabled:opacity-40 hover:bg-indigo-600 transition-colors flex-shrink-0"
            >
              {posting ? '...' : '등록'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
