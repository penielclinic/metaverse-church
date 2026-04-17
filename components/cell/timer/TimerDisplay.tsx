'use client'

interface TimerDisplayProps {
  stepName: string
  stepEmoji: string
  remainingSeconds: number
  totalSeconds: number
  isWarning: boolean
  isRunning: boolean
}

export default function TimerDisplay({
  stepName,
  stepEmoji,
  remainingSeconds,
  totalSeconds,
  isWarning,
  isRunning,
}: TimerDisplayProps) {
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const progress = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0

  const SIZE = 192
  const STROKE = 14
  const radius = (SIZE - STROKE) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - Math.min(progress, 1))
  const color = isWarning ? '#ef4444' : '#6366f1'

  return (
    <div className="flex flex-col items-center gap-3">
      <p
        className={`text-lg font-bold transition-colors ${
          isWarning ? 'text-red-500' : 'text-indigo-700'
        }`}
        style={{ wordBreak: 'keep-all' }}
      >
        {stepEmoji} {stepName} 시간
      </p>

      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        {/* SVG — rotated -90° so progress starts at top */}
        <svg
          width={SIZE}
          height={SIZE}
          className="-rotate-90"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
        >
          {/* track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={STROKE}
          />
          {/* progress */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: isRunning
                ? 'stroke-dashoffset 1s linear, stroke 0.3s'
                : 'stroke 0.3s',
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-5xl font-bold tabular-nums tracking-tight transition-colors ${
              isWarning ? 'text-red-500' : 'text-gray-800'
            }`}
          >
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>

          {isWarning && isRunning && (
            <span className="mt-1 text-xs font-semibold text-red-400 animate-pulse">
              곧 종료
            </span>
          )}
          {!isRunning && remainingSeconds > 0 && remainingSeconds < totalSeconds && (
            <span className="mt-1 text-xs text-gray-400">일시정지</span>
          )}
          {remainingSeconds === 0 && (
            <span className="mt-1 text-xs font-semibold text-gray-500">종료</span>
          )}
        </div>
      </div>
    </div>
  )
}
