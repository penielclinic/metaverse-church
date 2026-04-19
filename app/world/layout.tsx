'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import HUD from '@/components/world/HUD'
import SpaceSidebar from '@/components/world/SpaceSidebar'
import { useAvatarStore } from '@/store/avatarStore'
import { useWorldStore } from '@/store/worldStore'
import { useWorldPresence } from '@/lib/supabase/presence'
import { SPACES } from '@/lib/spaces'
import { createClient } from '@/lib/supabase/client'

export default function WorldLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAvatarPage = pathname === '/world/avatar'

  const { setAvatar, name, level } = useAvatarStore()
  const { setCurrentSpace, setOnlineUsers, currentSpaceSlug } = useWorldStore()
  const [userId, setUserId] = useState<string | null>(null)

  // 아바타 데이터 로드 + userId 확보
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

    const supabase = createClient()
    supabase.auth.getUser()
      .then(({ data: { user } }) => { if (user) setUserId(user.id) })
      .catch(() => {})
  }, [setAvatar])

  // pathname → 현재 공간 자동 동기화
  useEffect(() => {
    if (pathname === '/world') {
      setCurrentSpace('world', '대시보드')
      return
    }
    const matched = SPACES.find((s) => pathname.startsWith(s.path))
    if (matched) setCurrentSpace(matched.slug, matched.name)
  }, [pathname, setCurrentSpace])

  // 전역 presence 추적 (공간별 접속자 수 실시간 집계)
  useWorldPresence({
    userId,
    name,
    spaceSlug: currentSpaceSlug,
    avatarLevel: level,
    onSync: setOnlineUsers,
  })

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
