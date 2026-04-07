'use client'

interface SpaceCardProps {
  emoji: string
  name: string
  description: string
  slug: string
  onlineCount: number
  onClick: () => void
  disabled?: boolean
}

export default function SpaceCard({
  emoji,
  name,
  description,
  slug,
  onlineCount,
  onClick,
  disabled = false,
}: SpaceCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-slug={slug}
      className={[
        'group relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-center',
        'bg-white shadow-sm transition-all duration-200',
        disabled
          ? 'opacity-50 cursor-not-allowed border-gray-200'
          : 'border-gray-200 hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5 active:scale-95 cursor-pointer',
      ].join(' ')}
    >
      {/* 이모지 */}
      <span className="text-4xl leading-none mt-1">{emoji}</span>

      {/* 공간명 */}
      <span className="whitespace-nowrap text-base font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">
        {name}
      </span>

      {/* 설명 */}
      <p
        className="text-xs text-gray-500 leading-snug px-1"
        style={{ wordBreak: 'keep-all' }}
      >
        {description}
      </p>

      {/* 접속자 수 */}
      <div className="flex items-center gap-1 mt-auto pt-1">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {onlineCount}명 접속 중
        </span>
      </div>

      {/* hover 배경 효과 */}
      <span className="absolute inset-0 rounded-2xl bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
    </button>
  )
}
