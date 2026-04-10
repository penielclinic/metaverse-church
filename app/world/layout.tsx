'use client'

import { usePathname } from 'next/navigation'
import HUD from '@/components/world/HUD'

// metadata는 client component에서 export 불가 — 별도 head 없이 전역 layout에 의존

export default function WorldLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const hideHUD = pathname === '/world/avatar'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 아바타 설정 페이지에서는 HUD 숨김 */}
      {!hideHUD && <HUD />}

      <main className={hideHUD ? 'min-h-screen' : 'pt-14 min-h-screen'}>
        {children}
      </main>
    </div>
  )
}
