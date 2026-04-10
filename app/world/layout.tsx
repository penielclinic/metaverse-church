'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import HUD from '@/components/world/HUD'
import { useAvatarStore } from '@/store/avatarStore'

// metadata는 client component에서 export 불가 — 별도 head 없이 전역 layout에 의존

export default function WorldLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const hideHUD = pathname === '/world/avatar'
  const { setAvatar } = useAvatarStore()

  // 앱 첫 로드 시 DB에 저장된 아바타 데이터를 Zustand에 반영
  useEffect(() => {
    fetch('/api/avatar')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.avatar) {
          const { skin_tone, hair_style, outfit } = data.avatar
          setAvatar({ skinTone: skin_tone, hairStyle: hair_style, outfit })
        }
      })
      .catch(() => {/* 비로그인 상태 등 무시 */})
  }, [setAvatar])

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
