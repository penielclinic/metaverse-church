import DevotionFeed from '@/components/devotion/DevotionFeed'

export default function SanctuaryPage() {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-gradient-to-b from-indigo-50 to-purple-50 px-4 py-6">
      <div className="max-w-screen-md mx-auto space-y-6">

        {/* 페이지 헤더 */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">⛪ 본당</h1>
          <p className="mt-1 text-sm text-gray-500" style={{ wordBreak: 'keep-all' }}>
            말씀 묵상을 나누고 셀원들의 큐티에 아멘으로 응답해요
          </p>
        </div>

        {/* 큐티 인증 피드 */}
        <DevotionFeed />

        <div className="h-6" />
      </div>
    </div>
  )
}
