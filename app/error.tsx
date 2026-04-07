'use client'

import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center px-6 text-white text-center">
      <div className="text-6xl mb-6">⚠️</div>
      <h1 className="text-2xl font-bold mb-2" style={{ wordBreak: 'keep-all' }}>
        오류가 발생했습니다
      </h1>
      <p className="text-indigo-300 mb-8 text-sm" style={{ wordBreak: 'keep-all' }}>
        일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
      </p>
      {error.digest && (
        <p className="text-indigo-500 text-xs mb-6 font-mono">오류 코드: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="bg-indigo-500 hover:bg-indigo-400 active:scale-95 transition-all text-white font-semibold px-8 py-4 rounded-2xl min-h-[48px]"
      >
        다시 시도
      </button>
    </div>
  )
}
