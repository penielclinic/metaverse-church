'use client'

export interface PrayerCardData {
  id: number
  cell_id: number
  user_id: string
  content: string
  color: 'yellow' | 'blue' | 'green' | 'pink'
  amen_count: number
  is_answered: boolean
  created_at: string
  authorName: string
  isMyOwn: boolean
  isAmenedByMe: boolean
}

interface PrayerCardProps extends PrayerCardData {
  onAmen: (id: number) => void
  onAnswered: (id: number) => void
  onDelete: (id: number) => void
  amenLoading: boolean
}

const COLOR_MAP: Record<string, { card: string; badge: string; amen: string; amenActive: string }> = {
  yellow: {
    card: 'bg-yellow-50 border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700',
    amen: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
    amenActive: 'bg-yellow-500 text-white',
  },
  blue: {
    card: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    amen: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    amenActive: 'bg-blue-500 text-white',
  },
  green: {
    card: 'bg-green-50 border-green-200',
    badge: 'bg-green-100 text-green-700',
    amen: 'bg-green-100 text-green-700 hover:bg-green-200',
    amenActive: 'bg-green-500 text-white',
  },
  pink: {
    card: 'bg-pink-50 border-pink-200',
    badge: 'bg-pink-100 text-pink-700',
    amen: 'bg-pink-100 text-pink-700 hover:bg-pink-200',
    amenActive: 'bg-pink-500 text-white',
  },
}

export default function PrayerCard({
  id,
  content,
  color,
  amen_count,
  is_answered,
  created_at,
  authorName,
  isMyOwn,
  isAmenedByMe,
  onAmen,
  onAnswered,
  onDelete,
  amenLoading,
}: PrayerCardProps) {
  const colors = COLOR_MAP[color] ?? COLOR_MAP.yellow

  const dateStr = new Date(created_at).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  })

  const initials = authorName.slice(0, 1)

  return (
    <div
      className={[
        'relative border rounded-2xl p-4 space-y-3 shadow-sm transition-shadow hover:shadow-md',
        colors.card,
        is_answered ? 'opacity-70' : '',
      ].join(' ')}
    >
      {/* 완료 오버레이 */}
      {is_answered && (
        <div className="absolute top-3 right-3 text-xl" aria-label="응답받은 기도">
          ✝️
        </div>
      )}

      {/* 작성자 헤더 */}
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${colors.badge}`}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-800 whitespace-nowrap">
            {authorName}
            {isMyOwn && (
              <span className={`ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                나
              </span>
            )}
          </p>
          <p className="text-[11px] text-gray-400">{dateStr}</p>
        </div>

        {/* 내 카드 — 수정/삭제 */}
        {isMyOwn && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onAnswered(id)}
              aria-label={is_answered ? '응답 취소' : '기도 응답 체크'}
              title={is_answered ? '응답 취소' : '응답받음으로 표시'}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✝️
            </button>
            <button
              onClick={() => onDelete(id)}
              aria-label="기도제목 삭제"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* 내용 */}
      <p
        className="text-sm text-gray-700 leading-relaxed"
        style={{ wordBreak: 'keep-all' }}
      >
        {content}
      </p>

      {/* 아멘 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={() => !amenLoading && onAmen(id)}
          disabled={amenLoading}
          aria-label={isAmenedByMe ? '아멘 취소' : '아멘'}
          className={[
            'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-bold transition-all active:scale-95',
            amenLoading
              ? 'bg-gray-100 text-gray-400 cursor-wait'
              : isAmenedByMe
              ? colors.amenActive
              : colors.amen,
          ].join(' ')}
        >
          {amenLoading ? (
            <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>🙏</span>
          )}
          <span>아멘{amen_count > 0 ? ` ${amen_count}` : ''}</span>
        </button>
      </div>
    </div>
  )
}
