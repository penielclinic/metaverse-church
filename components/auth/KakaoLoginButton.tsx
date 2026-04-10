'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function KakaoLoginButton({ redirectTo }: { redirectTo?: string }) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleLogin() {
    setIsLoading(true)
    const supabase = createClient()
    const callbackUrl = redirectTo
      ? `${location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
      : `${location.origin}/auth/callback`
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: callbackUrl },
    })
    setIsLoading(false)
  }

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      style={{ backgroundColor: '#FEE500' }}
      className="flex items-center justify-center gap-3 w-full min-h-[56px] rounded-xl font-bold text-[#191919] text-lg shadow-md active:scale-95 transition-transform disabled:opacity-60"
    >
      {/* 카카오 로고 */}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3C6.477 3 2 6.582 2 11c0 2.822 1.77 5.3 4.438 6.79L5.5 21l4.2-2.76A11.9 11.9 0 0 0 12 18.4c5.523 0 10-3.582 10-8S17.523 3 12 3Z"
          fill="#191919"
        />
      </svg>
      {isLoading ? '로그인 중...' : '카카오로 시작하기'}
    </button>
  )
}
