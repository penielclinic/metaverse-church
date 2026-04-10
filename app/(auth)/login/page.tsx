import KakaoLoginButton from '@/components/auth/KakaoLoginButton'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-6">
      {/* 로고 + 앱 이름 */}
      <div className="flex flex-col items-center mb-12">
        <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center shadow-lg mb-5">
          {/* 교회 십자가 아이콘 */}
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-label="교회 십자가">
            <rect x="20" y="6" width="8" height="36" rx="3" fill="white" />
            <rect x="8" y="16" width="32" height="8" rx="3" fill="white" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-blue-900 tracking-tight" style={{ wordBreak: 'keep-all' }}>
          이음 메타버스
        </h1>
        <p className="mt-2 text-base text-gray-500 text-center" style={{ wordBreak: 'keep-all' }}>
          해운대순복음교회 가상 예배 공간
        </p>
      </div>

      {/* 로그인 카드 */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 flex flex-col gap-5">
        <p className="text-center text-gray-700 font-medium text-base" style={{ wordBreak: 'keep-all' }}>
          카카오 계정으로 간편하게 로그인하세요
        </p>

        <KakaoLoginButton />

        {searchParams.error && (
          <p className="text-center text-sm text-red-500" style={{ wordBreak: 'keep-all' }}>
            로그인에 실패했습니다. 다시 시도해 주세요.
          </p>
        )}
      </div>

      {/* 하단 안내 */}
      <p className="mt-8 text-sm text-gray-400 text-center" style={{ wordBreak: 'keep-all' }}>
        로그인 시 <span className="underline">이용약관</span> 및{' '}
        <span className="underline">개인정보처리방침</span>에 동의하게 됩니다.
      </p>
    </main>
  )
}
