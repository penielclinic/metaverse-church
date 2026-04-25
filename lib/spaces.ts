export interface SpaceConfig {
  slug: string
  name: string
  emoji: string
  description: string
  path: string
  disabled?: boolean
}

export const SPACES: SpaceConfig[] = [
  {
    slug: 'sanctuary',
    name: '예배',
    emoji: '⛪',
    description: '주일·새벽예배 라이브 스트리밍',
    path: '/world/sanctuary',
  },
  {
    slug: 'plaza',
    name: '교제광장',
    emoji: '🌳',
    description: '성도들이 모이는 만남의 광장',
    path: '/world/plaza',
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
