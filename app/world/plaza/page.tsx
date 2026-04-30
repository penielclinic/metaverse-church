'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PlazaCanvas from '@/components/world/PlazaCanvas'
import { useAvatarStore } from '@/store/avatarStore'

interface Profile {
  id: string
  name: string
}

export default function PlazaPage() {
  const router = useRouter()
  const { skinTone, gender, hairStyle, outfit, eyeMakeup, glasses, earring, necklace, hat } = useAvatarStore()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/avatar')
      .then((res) => {
        if (res.status === 401) { router.replace('/login'); return null }
        return res.ok ? res.json() : null
      })
      .then((data) => {
        if (data) setProfile({ id: data.userId, name: data.name })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="px-4 py-5 max-w-screen-md mx-auto space-y-4">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl font-bold text-gray-800" style={{ wordBreak: 'keep-all' }}>
          ✝️ 교제광장 — 해운대순복음교회
        </h1>
        <p className="text-sm text-gray-500 mt-0.5" style={{ wordBreak: 'keep-all' }}>
          성도들과 함께 교제해요. 바닥 클릭: 이동 · 벤치 클릭: 앉기
        </p>
      </div>

      {/* 광장 캔버스 */}
      <PlazaCanvas
        userId={profile.id}
        name={profile.name}
        skinTone={skinTone}
        gender={gender}
        hairStyle={hairStyle}
        outfit={outfit}
        eyeMakeup={eyeMakeup}
        glasses={glasses}
        earring={earring}
        necklace={necklace}
        hat={hat}
      />

      {/* 접속자 수 표시는 Presence onSync에서 가져옴 — 향후 확장 */}
    </div>
  )
}
