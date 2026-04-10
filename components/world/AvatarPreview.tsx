'use client'

// 피부색 팔레트
const SKIN_COLORS: Record<string, string> = {
  light: '#FDDBB4',
  medium: '#F0C27F',
  tan: '#D4915A',
  dark: '#8D5524',
}

// 머리카락 색 (헤어스타일별 기본색)
const HAIR_COLOR = '#4a3728'

type SkinTone = 'light' | 'medium' | 'tan' | 'dark'
type HairStyle = 'short' | 'long' | 'curly' | 'bald' | 'ponytail'
type Outfit = 'casual' | 'formal' | 'hanbok' | 'worship_team' | 'pastor'

interface Props {
  skinTone: SkinTone
  hairStyle: HairStyle
  outfit: Outfit
  size?: number
}

// 옷 색상
const OUTFIT_COLORS: Record<Outfit, { body: string; collar: string }> = {
  casual:       { body: '#6366f1', collar: '#fff' },
  formal:       { body: '#1e293b', collar: '#fff' },
  hanbok:       { body: '#ec4899', collar: '#fde68a' },
  worship_team: { body: '#7c3aed', collar: '#ddd6fe' },
  pastor:       { body: '#374151', collar: '#fff' },
}

function HairSVG({ style, color }: { style: HairStyle; color: string }) {
  switch (style) {
    case 'short':
      return <ellipse cx="50" cy="30" rx="22" ry="18" fill={color} />
    case 'long':
      return (
        <>
          <ellipse cx="50" cy="28" rx="22" ry="18" fill={color} />
          <rect x="28" y="38" width="10" height="30" rx="5" fill={color} />
          <rect x="62" y="38" width="10" height="30" rx="5" fill={color} />
        </>
      )
    case 'curly':
      return (
        <>
          <ellipse cx="50" cy="28" rx="24" ry="20" fill={color} />
          <circle cx="30" cy="30" r="8" fill={color} />
          <circle cx="70" cy="30" r="8" fill={color} />
          <circle cx="50" cy="14" r="8" fill={color} />
        </>
      )
    case 'bald':
      return null
    case 'ponytail':
      return (
        <>
          <ellipse cx="50" cy="28" rx="22" ry="18" fill={color} />
          <rect x="62" y="20" width="8" height="28" rx="4" fill={color} />
          <ellipse cx="70" cy="50" rx="6" ry="8" fill={color} />
        </>
      )
    default:
      return null
  }
}

export default function AvatarPreview({ skinTone, hairStyle, outfit, size = 120 }: Props) {
  const skin = SKIN_COLORS[skinTone] ?? SKIN_COLORS.medium
  const { body: outfitBody, collar: outfitCollar } = OUTFIT_COLORS[outfit] ?? OUTFIT_COLORS.casual

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="아바타 미리보기"
    >
      {/* 몸 */}
      <ellipse cx="50" cy="82" rx="28" ry="18" fill={outfitBody} />
      {/* 칼라 */}
      <polygon points="44,68 50,76 56,68" fill={outfitCollar} />
      {/* 목 */}
      <rect x="44" y="58" width="12" height="12" rx="4" fill={skin} />
      {/* 머리 */}
      <HairSVG style={hairStyle} color={HAIR_COLOR} />
      <ellipse cx="50" cy="42" rx="20" ry="22" fill={skin} />
      {/* 눈 */}
      <circle cx="43" cy="40" r="2.5" fill="#333" />
      <circle cx="57" cy="40" r="2.5" fill="#333" />
      {/* 눈 하이라이트 */}
      <circle cx="44" cy="39" r="1" fill="#fff" />
      <circle cx="58" cy="39" r="1" fill="#fff" />
      {/* 입 */}
      <path d="M44 50 Q50 55 56 50" stroke="#c0777a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* 볼 */}
      <circle cx="38" cy="47" r="4" fill="#f9a8a8" opacity="0.4" />
      <circle cx="62" cy="47" r="4" fill="#f9a8a8" opacity="0.4" />
    </svg>
  )
}
