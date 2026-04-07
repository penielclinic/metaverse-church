'use client'

export interface LeaderboardEntry {
  rank: number
  cellName: string
  exp: number
  memberCount: number
  isMyCell?: boolean
}

interface LeaderboardProps {
  entries: LeaderboardEntry[]
}

const RANK_META: Record<number, { medal: string; bg: string; border: string; text: string }> = {
  1: { medal: '🥇', bg: 'bg-amber-50',  border: 'border-amber-300', text: 'text-amber-700' },
  2: { medal: '🥈', bg: 'bg-gray-50',   border: 'border-gray-300',  text: 'text-gray-600'  },
  3: { medal: '🥉', bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' },
}

export default function Leaderboard({ entries }: LeaderboardProps) {
  return (
    <div>
      <h2 className="text-base font-bold text-gray-800 mb-3">🏆 셀 주간 랭킹</h2>

      <div className="space-y-2">
        {entries.map((entry) => {
          const meta = RANK_META[entry.rank]
          return (
            <div
              key={entry.rank}
              className={[
                'flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all',
                meta
                  ? `${meta.bg} ${meta.border}`
                  : entry.isMyCell
                  ? 'bg-indigo-50 border-indigo-200'
                  : 'bg-white border-gray-200',
              ].join(' ')}
            >
              {/* 순위 */}
              <div className="flex-shrink-0 w-8 text-center">
                {meta ? (
                  <span className="text-xl">{meta.medal}</span>
                ) : (
                  <span className="text-sm font-bold text-gray-400">
                    {entry.rank}
                  </span>
                )}
              </div>

              {/* 셀 이름 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={[
                      'text-sm font-bold whitespace-nowrap',
                      meta ? meta.text : entry.isMyCell ? 'text-indigo-700' : 'text-gray-700',
                    ].join(' ')}
                  >
                    {entry.cellName}
                  </span>
                  {entry.isMyCell && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full whitespace-nowrap font-semibold">
                      우리 순
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-gray-400">
                  {entry.memberCount}명
                </span>
              </div>

              {/* 경험치 */}
              <div className="flex-shrink-0 text-right">
                <span
                  className={[
                    'text-sm font-black whitespace-nowrap',
                    meta ? meta.text : 'text-gray-600',
                  ].join(' ')}
                >
                  {entry.exp.toLocaleString()}
                </span>
                <span className="text-[11px] text-gray-400 ml-0.5">EXP</span>
              </div>
            </div>
          )
        })}
      </div>

      <p
        className="mt-2 text-center text-[11px] text-gray-400"
        style={{ wordBreak: 'keep-all' }}
      >
        매주 월요일 0시 초기화 · 셀원 전체 누적 경험치 합산
      </p>
    </div>
  )
}
