'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ADMIN_PASSWORD = '1234'

export default function AdminButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setPw('')
      setError(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pw === ADMIN_PASSWORD) {
      setOpen(false)
      router.push('/admin')
    } else {
      setError(true)
      setPw('')
      inputRef.current?.focus()
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-indigo-400 hover:text-indigo-200 text-sm transition-colors mt-2 px-3 py-2 rounded-xl hover:bg-white/10 active:scale-95"
      >
        🔧 관리자
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-indigo-950 border border-indigo-700 rounded-2xl p-8 w-full max-w-xs shadow-2xl">
            <h2 className="text-white font-bold text-lg mb-1 text-center" style={{ wordBreak: 'keep-all' }}>
              관리자 페이지
            </h2>
            <p className="text-indigo-300 text-sm text-center mb-6" style={{ wordBreak: 'keep-all' }}>
              비밀번호를 입력해주세요
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                ref={inputRef}
                type="password"
                value={pw}
                onChange={(e) => { setPw(e.target.value); setError(false) }}
                placeholder="비밀번호"
                className={[
                  'w-full bg-indigo-900 text-white placeholder-indigo-400 border rounded-xl px-4 py-3 text-center text-lg tracking-widest outline-none transition-colors',
                  error
                    ? 'border-red-500 focus:border-red-400'
                    : 'border-indigo-600 focus:border-indigo-400',
                ].join(' ')}
              />
              {error && (
                <p className="text-red-400 text-sm text-center -mt-2">
                  비밀번호가 올바르지 않습니다
                </p>
              )}
              <button
                type="submit"
                className="bg-indigo-500 hover:bg-indigo-400 active:scale-95 transition-all text-white font-semibold py-3 rounded-xl"
              >
                확인
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-indigo-400 hover:text-indigo-200 text-sm transition-colors py-1"
              >
                취소
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
