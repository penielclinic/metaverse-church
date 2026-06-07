'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function PendingPage() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center gap-5 text-center">
        {/* 아이콘 */}
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center text-4xl">
          ⏳
        </div>

        <div>
          <h1 className="text-xl font-bold text-gray-800 mb-2" style={{ wordBreak: 'keep-all' }}>
            승인 대기 중입니다
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed" style={{ wordBreak: 'keep-all' }}>
            가입 신청이 완료되었습니다.<br />
            관리자 승인 후 이음 메타버스를<br />
            이용하실 수 있습니다.
          </p>
        </div>

        <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-xs text-amber-700 leading-relaxed" style={{ wordBreak: 'keep-all' }}>
            📞 승인 문의: 교회 행정실 또는 담당 전도사님께 연락해 주세요.
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full border border-gray-300 text-gray-600 font-medium rounded-xl py-3 text-sm hover:bg-gray-50 active:scale-95 transition-all min-h-[48px]"
        >
          로그아웃
        </button>
      </div>
    </main>
  )
}
