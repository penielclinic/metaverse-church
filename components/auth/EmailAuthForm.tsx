'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'signup'

export default function EmailAuthForm() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false) // 가입 완료 상태

  async function handleLogin() {
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      return
    }
    router.push('/world')
    router.refresh()
  }

  async function handleSignup() {
    setError('')
    if (!name.trim()) { setError('이름을 입력해 주세요.'); return }
    if (!email.trim()) { setError('이메일을 입력해 주세요.'); return }
    if (password.length < 6) { setError('비밀번호는 6자리 이상이어야 합니다.'); return }
    setLoading(true)
    const res = await fetch('/api/auth/email-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password, phone: phone.trim() }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error ?? '가입에 실패했습니다.'); return }
    setDone(true)
  }

  // 가입 완료 안내 화면
  if (done) {
    return (
      <div className="text-center py-4 space-y-3">
        <p className="text-3xl">✅</p>
        <p className="font-bold text-gray-800 text-base" style={{ wordBreak: 'keep-all' }}>
          가입 신청이 완료되었습니다
        </p>
        <p className="text-sm text-gray-500" style={{ wordBreak: 'keep-all' }}>
          관리자 승인 후 로그인하실 수 있습니다.<br />
          승인이 완료되면 다시 로그인해 주세요.
        </p>
        <button
          onClick={() => { setDone(false); setMode('login') }}
          className="mt-2 text-indigo-600 text-sm font-medium underline"
        >
          로그인 화면으로
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 탭 */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        {(['login', 'signup'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError('') }}
            className={[
              'flex-1 py-2.5 text-sm font-semibold transition-colors min-h-[44px]',
              mode === m
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50',
            ].join(' ')}
          >
            {m === 'login' ? '로그인' : '회원가입'}
          </button>
        ))}
      </div>

      {/* 가입 전용 필드 */}
      {mode === 'signup' && (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="이름 (예: 홍길동)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[52px]"
          />
          <input
            type="tel"
            placeholder="전화번호 (선택)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[52px]"
          />
        </div>
      )}

      {/* 공통 필드 */}
      <input
        type="email"
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[52px]"
      />
      <input
        type="password"
        placeholder="비밀번호 (6자리 이상)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleSignup())}
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[52px]"
      />

      {error && (
        <p className="text-sm text-red-500 text-center" style={{ wordBreak: 'keep-all' }}>{error}</p>
      )}

      <button
        onClick={mode === 'login' ? handleLogin : handleSignup}
        disabled={loading}
        className="w-full bg-indigo-600 text-white font-bold rounded-xl py-3 text-base hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all min-h-[52px]"
      >
        {loading ? '처리 중...' : mode === 'login' ? '로그인' : '가입 신청'}
      </button>
    </div>
  )
}
