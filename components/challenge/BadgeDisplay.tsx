'use client'

import { useState } from 'react'

export interface Badge {
  slug: string
  label: string
  emoji: string
  description: string
  earned: boolean
  earnedAt?: string | null
}

interface BadgeDisplayProps {
  badges: Badge[]
}

export default function BadgeDisplay({ badges }: BadgeDisplayProps) {
  const [tooltip, setTooltip] = useState<string | null>(null)
  const earned = badges.filter((b) => b.earned).length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-800">🎖 내 뱃지</h2>
        <span className="text-xs text-gray-400">
          {earned}/{badges.length} 획득
        </span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {badges.map((badge) => (
          <button
            key={badge.slug}
            onClick={() =>
              setTooltip(tooltip === badge.slug ? null : badge.slug)
            }
            className={[
              'relative flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all',
              badge.earned
                ? 'border-amber-300 bg-amber-50 shadow-sm'
                : 'border-gray-200 bg-gray-50 opacity-40 grayscale',
            ].join(' ')}
            title={badge.description}
          >
            <span className="text-2xl leading-none">{badge.emoji}</span>
            <span
              className="text-[10px] font-semibold text-gray-700 text-center leading-tight whitespace-nowrap"
            >
              {badge.label}
            </span>

            {/* 획득일 */}
            {badge.earned && badge.earnedAt && (
              <span className="text-[9px] text-amber-500">
                {new Date(badge.earnedAt).toLocaleDateString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}

            {/* 툴팁 */}
            {tooltip === badge.slug && (
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 w-40 bg-gray-800 text-white text-xs rounded-xl px-3 py-2 shadow-lg pointer-events-none"
                style={{ wordBreak: 'keep-all' }}
              >
                <div className="font-bold mb-0.5">
                  {badge.emoji} {badge.label}
                </div>
                <div className="text-gray-300 leading-snug">{badge.description}</div>
                {!badge.earned && (
                  <div className="mt-1 text-gray-400 text-[10px]">미획득</div>
                )}
                {/* 말풍선 꼬리 */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
