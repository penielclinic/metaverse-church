import SanctuaryLive from '@/components/world/SanctuaryLive'
import DevotionFeed from '@/components/devotion/DevotionFeed'

export default function SanctuaryPage() {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-gradient-to-b from-indigo-50 to-purple-50 px-4 py-6">
      <div className="max-w-screen-md mx-auto space-y-6">

        {/* 페이지 헤더 */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">⛪ 본당</h1>
          <p className="mt-1 text-sm text-gray-500" style={{ wordBreak: 'keep-all' }}>
            예배에 함께하고 아멘·박수로 반응해요
          </p>
        </div>

        {/* 라이브 스트리밍 + 실시간 반응 버튼 */}
        <SanctuaryLive />

        {/* 말씀 묵상 나눔 */}
        <div>
          <h2 className="text-base font-bold text-gray-700 mb-3">📖 말씀 묵상 나눔</h2>
          <DevotionFeed />
        </div>

        <div className="h-6" />
      </div>
    </div>
  )
}
