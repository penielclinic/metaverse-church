import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center px-6 text-white text-center">
      <div className="text-7xl mb-4">🗺️</div>
      <h1 className="text-3xl font-bold mb-2">404</h1>
      <p className="text-indigo-300 mb-2 text-lg font-semibold" style={{ wordBreak: 'keep-all' }}>
        이 공간을 찾을 수 없습니다
      </p>
      <p className="text-indigo-400 mb-10 text-sm" style={{ wordBreak: 'keep-all' }}>
        주소가 잘못됐거나 삭제된 페이지입니다.
      </p>
      <Link
        href="/"
        className="bg-indigo-500 hover:bg-indigo-400 active:scale-95 transition-all text-white font-semibold px-8 py-4 rounded-2xl min-h-[48px] inline-flex items-center"
      >
        ⛪ 메인으로 돌아가기
      </Link>
    </div>
  )
}
