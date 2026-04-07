'use client'

import { useState } from 'react'

export interface ChallengeCardProps {
  id: number
  title: string
  description: string
  type: 'bible' | 'prayer' | 'worship' | 'service'
  progress: number
  targetCount: number
  expReward: number
  badgeReward: string | null
  completed: boolean
  onComplete: (id: number) => Promise<void>
}

const TYPE_META: Record<ChallengeCardProps['type'], { emoji: string; color: string }> = {
  bible:   { emoji: '📖', color: 'bg-blue-50 border-blue-200' },
  prayer:  { emoji: '🙏', color: 'bg-purple-50 border-purple-200' },
  worship: { emoji: '⛪', color: 'bg-amber-50 border-amber-200' },
  service: { emoji: '🤝', color: 'bg-green-50 border-green-200' },
}

export default function ChallengeCard({
  id,
  title,
  description,
  type,
  progress,
  targetCount,
  expReward,
  badgeReward,
  completed,
  onComplete,
}: ChallengeCardProps) {
  const [loading, setLoading] = useState(false)
  const percent = Math.min(Math.round((progress / targetCount) * 100), 100)
  const { emoji, color } = TYPE_META[type]

  const handleComplete = async () => {
    if (loading || completed) return
    setLoading(true)
    try {
      await onComplete(id)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={[
        'rounded-2xl border-2 p-4 shadow-sm transition-all',
        completed
          ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300 ring-offset-1'
          : color,
      ].join(' ')}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">{emoji}</span>
          <h3
            className="text-sm font-bold text-gray-800 leading-snug"
            style={{ wordBreak: 'keep-all' }}
          >
            {title}
          </h3>
        </div>
        {completed && (
          <span className="flex-shrink-0 text-lg" title="완료">
            ✅
          </span>
        )}
      </div>

      {/* 설명 */}
      <p
        className="text-xs text-gray-500 mb-3 leading-relaxed"
        style={{ wordBreak: 'keep-all' }}
      >
        {description}
      </p>

      {/* 진행률 바 */}
      <div className="mb-1">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>진행률</span>
          <span className="font-medium">
            {progress}/{targetCount}
          </span>
        </div>
        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={[
              'h-full rounded-full transition-all duration-500',
              completed ? 'bg-amber-400' : 'bg-indigo-500',
            ].join(' ')}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* 보상 */}
      <div className="flex items-center gap-2 mt-3 mb-3">
        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
          +{expReward} EXP
        </span>
        {badgeReward && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
            {badgeReward}
          </span>
        )}
      </div>

      {/* 완료 버튼 */}
      {!completed && (
        <button
          onClick={handleComplete}
          disabled={loading || progress >= targetCount}
          className={[
            'w-full py-2 rounded-xl text-sm font-bold transition-all',
            loading
              ? 'bg-gray-200 text-gray-400 cursor-wait'
              : progress >= targetCount
              ? 'bg-green-100 text-green-600 cursor-default'
              : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white',
          ].join(' ')}
        >
          {loading
            ? '처리 중...'
            : progress >= targetCount
            ? '인증 가능 🎉'
            : '인증하기'}
        </button>
      )}
      {completed && (
        <div className="w-full py-2 rounded-xl text-sm font-bold text-center bg-amber-200/60 text-amber-700">
          이번 주 완료 ✅
        </div>
      )}
    </div>
  )
}
