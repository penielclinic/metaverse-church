'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import SpaceCard from '@/components/world/SpaceCard'
import { useWorldStore } from '@/store/worldStore'
import { useAvatarStore } from '@/store/avatarStore'
import AvatarPreview from '@/components/world/AvatarPreview'
import { SPACES } from '@/lib/spaces'

export default function WorldPage() {
  const router = useRouter()
  const { setCurrentSpace, getSpaceUserCount } = useWorldStore()
  const { name, level, skinTone, gender, hairStyle, outfit } = useAvatarStore()

  const handleEnterSpace = (slug: string, name: string, path: string) => {
    setCurrentSpace(slug, name)
    router.push(path)
  }

  return (
    <div className="px-4 py-6 max-w-screen-md mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <h1
          className="text-2xl font-bold text-gray-800"
          style={{ wordBreak: 'keep-all' }}
        >
          이음 메타버스에 오신 걸 환영합니다 👋
        </h1>
        <p
          className="mt-1 text-sm text-gray-500"
          style={{ wordBreak: 'keep-all' }}
        >
          아래 공간을 선택해 입장하세요. 함께 예배하고 교제해요.
        </p>
      </div>

      {/* 아바타 카드 */}
      <Link href="/world/avatar">
        <div className="flex items-center gap-4 mb-6 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl hover:bg-indigo-100 transition-colors cursor-pointer">
          {/* 아바타 미리보기 */}
          <div className="flex-shrink-0 w-14 h-14 rounded-full bg-white border-2 border-indigo-200 overflow-hidden flex items-center justify-center">
            <AvatarPreview
              skinTone={skinTone as 'light' | 'medium' | 'tan' | 'dark'}
              gender={gender}
              hairStyle={hairStyle}
              outfit={outfit as 'casual' | 'formal' | 'hanbok' | 'worship_team' | 'pastor'}
              size={56}
              faceOnly
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-indigo-800 whitespace-nowrap truncate">
              {name} · Lv.{level}
            </p>
            <p className="text-xs text-indigo-500 mt-0.5" style={{ wordBreak: 'keep-all' }}>
              아바타를 꾸며보세요
            </p>
          </div>
          <span className="flex-shrink-0 text-xs font-semibold text-indigo-600 bg-white border border-indigo-200 px-3 py-1.5 rounded-full whitespace-nowrap">
            꾸미기 →
          </span>
        </div>
      </Link>

      {/* 공간 그리드 — 모바일 2열, sm 이상 4열 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SPACES.map((space) => (
          <SpaceCard
            key={space.slug}
            emoji={space.emoji}
            name={space.name}
            description={space.description}
            slug={space.slug}
            onlineCount={getSpaceUserCount(space.slug)}
            disabled={space.disabled}
            onClick={() => {
              if (!space.disabled) {
                handleEnterSpace(space.slug, space.name, space.path)
              }
            }}
          />
        ))}
      </div>

      {/* 준비 중 안내 */}
      <p className="mt-4 text-center text-xs text-gray-400">
        회색 카드는 준비 중인 공간입니다.
      </p>
    </div>
  )
}
