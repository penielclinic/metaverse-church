'use client'

import { useRouter } from 'next/navigation'
import SpaceCard from '@/components/world/SpaceCard'
import { useWorldStore } from '@/store/worldStore'

const SPACES = [
  {
    slug: 'sanctuary',
    name: '예배',
    emoji: '⛪',
    description: '주일·새벽예배 라이브 스트리밍',
    path: '/world/sanctuary',
  },
  {
    slug: 'prayer',
    name: '기도실',
    emoji: '🙏',
    description: '기도 포스트잇을 붙이고 아멘으로 응원해요',
    path: '/world/prayer',
  },
  {
    slug: 'challenge',
    name: '챌린지',
    emoji: '🏆',
    description: '말씀 암송·QT 챌린지에 참여하세요',
    path: '/world/challenge',
  },
  {
    slug: 'cell',
    name: '소그룹',
    emoji: '👥',
    description: '순 모임방 — 순장이 개설한 방에 입장',
    path: '/world/cell',
  },
  {
    slug: 'market',
    name: '나눔장터',
    emoji: '🛍️',
    description: '성도들이 나누는 물품·재능 나눔',
    path: '/world/market',
    disabled: true,
  },
  {
    slug: 'gallery',
    name: '갤러리',
    emoji: '🖼️',
    description: '교회 사진·행사 추억을 함께 봐요',
    path: '/world/gallery',
    disabled: true,
  },
  {
    slug: 'counsel',
    name: '상담실',
    emoji: '💬',
    description: '고민 나누기 & 교역자 1:1 상담 예약',
    path: '/world/counsel',
  },
  {
    slug: 'mission',
    name: '선교',
    emoji: '✈️',
    description: '선교회별 활동 현황과 기도 요청',
    path: '/world/mission',
    disabled: true,
  },
]

export default function WorldPage() {
  const router = useRouter()
  const { setCurrentSpace, getSpaceUserCount } = useWorldStore()

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
