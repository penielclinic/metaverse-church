import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-950 via-indigo-900 to-purple-950 flex flex-col items-center justify-center px-6 text-white">
      {/* 로고 / 타이틀 */}
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">⛪</div>
        <h1 className="text-4xl font-bold tracking-tight mb-2" style={{ wordBreak: 'keep-all' }}>
          이음 메타버스
        </h1>
        <p className="text-indigo-300 text-lg" style={{ wordBreak: 'keep-all' }}>
          해운대순복음교회 — 시공간을 초월한 예배와 교제
        </p>
      </div>

      {/* 입장 버튼 */}
      <div className="flex flex-col sm:flex-row gap-4 mb-16">
        <Link
          href="/world"
          className="bg-indigo-500 hover:bg-indigo-400 active:scale-95 transition-all text-white font-semibold text-lg px-8 py-4 rounded-2xl text-center min-w-[180px]"
        >
          🌐 메타버스 입장
        </Link>
        <Link
          href="/login"
          className="border border-indigo-400 hover:bg-indigo-800 active:scale-95 transition-all text-indigo-200 font-semibold text-lg px-8 py-4 rounded-2xl text-center min-w-[180px]"
        >
          🔑 로그인
        </Link>
      </div>

      {/* 공간 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-lg mb-16">
        {SPACES.map((space) => (
          <Link
            key={space.slug}
            href={`/world/${space.slug}`}
            className="bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-2xl p-5 flex flex-col items-center gap-2 text-center"
          >
            <span className="text-3xl">{space.icon}</span>
            <span className="text-sm font-medium whitespace-nowrap">{space.name}</span>
          </Link>
        ))}
      </div>

      {/* 하단 정보 */}
      <p className="text-indigo-400 text-sm text-center" style={{ wordBreak: 'keep-all' }}>
        성도 798명 · 셀 44개 · 선교회 12개
      </p>
    </main>
  )
}

const SPACES = [
  { slug: 'sanctuary', icon: '🕊️', name: '본당' },
  { slug: 'plaza', icon: '🌿', name: '교제광장' },
  { slug: 'prayer', icon: '🙏', name: '기도실' },
  { slug: 'library', icon: '📖', name: '설교아카이브' },
  { slug: 'cell/1', icon: '👥', name: '순 모임방' },
  { slug: 'scholarship', icon: '🎓', name: '장학관' },
]
