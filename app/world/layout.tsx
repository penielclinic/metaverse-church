'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import HUD from '@/components/world/HUD'
import SpaceSidebar from '@/components/world/SpaceSidebar'
import { useAvatarStore } from '@/store/avatarStore'

export default function WorldLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAvatarPage = pathname === '/world/avatar'
  const { setAvatar } = useAvatarStore()

  // 앱 첫 로드 시 DB에 저장된 아바타 데이터를 Zustand에 반영
  useEffect(() => {
    fetch('/api/avatar')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          const a = data.avatar ?? {}
          setAvatar({
            name:      data.name      ?? undefined,
            titles:    data.titles    ?? [],
            skinTone:  a.skin_tone    ?? undefined,
            gender:    a.gender       ?? 'male',
            hairStyle: a.hair_style   ?? undefined,
            outfit:    a.outfit       ?? undefined,
          })
        }
      })
      .catch(() => {/* 비로그인 상태 등 무시 */})
  }, [setAvatar])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 아바타 설정 페이지에서는 HUD·사이드바 숨김 */}
      {!isAvatarPage && <HUD />}
      {!isAvatarPage && <SpaceSidebar />}

      <main className={[
        'min-h-screen',
        isAvatarPage ? '' : 'pt-14',          // HUD 높이(56px)
        isAvatarPage ? '' : 'md:pl-20',       // 사이드바 너비(80px)
        isAvatarPage ? '' : 'pb-20 md:pb-0',  // 모바일 하단 탭바 높이
      ].join(' ')}>
        {children}
      </main>
    </div>
  )
}
