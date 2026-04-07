import type { Metadata } from 'next'
import HUD from '@/components/world/HUD'

export const metadata: Metadata = {
  title: '이음 메타버스 | 해운대순복음교회',
  description: '시공간을 초월한 가상 교회 플랫폼',
}

export default function WorldLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 HUD — 고정 */}
      <HUD />

      {/* 본문 — HUD 높이(56px)만큼 상단 패딩 */}
      <main className="pt-14 min-h-screen">{children}</main>
    </div>
  )
}
