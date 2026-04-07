'use client'

export interface DevotionCardData {
  id: number
  authorName: string
  authorId: string
  bibleRef: string
  content: string
  createdAt: string
  amenCount: number
  isAmenedByMe: boolean
  isMyOwn: boolean
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

      {/* 아멘 버튼 */}
      <div className="flex justify-end pt-0.5">
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
    </div>
  )
}
