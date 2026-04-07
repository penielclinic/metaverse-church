export default function LoginLoading() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white gap-5">
      {/* 스피너 */}
      <div className="w-14 h-14 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      <p className="text-blue-700 font-medium text-lg" style={{ wordBreak: 'keep-all' }}>
        로그인 중입니다…
      </p>
    </main>
  )
}
