'use client'

interface StreakCounterProps {
  streakDays: number
  checkedInToday: boolean
  onCheckIn?: () => void
  checkInLoading?: boolean
}

export default function StreakCounter({
  streakDays,
  checkedInToday,
  onCheckIn,
  checkInLoading = false,
}: StreakCounterProps) {
  const flames = Math.min(streakDays, 7)

  return (
    <div className="flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl px-4 py-3">
      {/* 왼쪽: 연속 카운터 */}
      <div className="flex items-center gap-2">
        <div className="flex">
          {Array.from({ length: 7 }).map((_, i) => (
            <span
              key={i}
              className={[
                'text-lg transition-all',
                i < flames ? 'opacity-100' : 'opacity-20 grayscale',
              ].join(' ')}
            >
              🔥
            </span>
          ))}
        </div>
        <div>
          <p className="text-xl font-black text-orange-600 leading-none">
            {streakDays}일
          </p>
          <p className="text-[11px] text-orange-400 font-medium whitespace-nowrap">
            연속 출석
          </p>
        </div>
      </div>

      {/* 오른쪽: 오늘 인증 상태 */}
      <div className="flex-shrink-0">
        {checkedInToday ? (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-2xl">✅</span>
            <span className="text-[11px] text-green-600 font-semibold whitespace-nowrap">
              오늘 인증 완료
            </span>
          </div>
        ) : (
          <button
            onClick={onCheckIn}
            disabled={checkInLoading}
            className={[
              'flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl font-bold text-sm transition-all',
              checkInLoading
                ? 'bg-gray-200 text-gray-400 cursor-wait'
                : 'bg-orange-500 hover:bg-orange-600 active:scale-95 text-white',
            ].join(' ')}
          >
            <span className="text-base leading-none">🔥</span>
            <span className="text-[11px] whitespace-nowrap">
              {checkInLoading ? '처리 중...' : '오늘 출석'}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
