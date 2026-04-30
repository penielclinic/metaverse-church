'use client'

const SKIN: Record<string, string> = {
  light: '#FDDBB4', medium: '#F0C27F', tan: '#D4915A', dark: '#8D5524',
}

export type SkinTone = 'light' | 'medium' | 'tan' | 'dark'
export type Gender   = 'male' | 'female'
export type Outfit   =
  | 'casual' | 'formal' | 'hanbok' | 'worship_team' | 'pastor'
  | 'hoodie' | 'shirt' | 'blouse' | 'sweater' | 'vest'

export const MALE_HAIR_OPTIONS = [
  { value: 'short',     label: '단발',    emoji: '💇‍♂️' },
  { value: 'sports',    label: '스포츠컷', emoji: '🏃' },
  { value: 'slickback', label: '올백',    emoji: '🕴️' },
  { value: 'sidepart',  label: '가르마',  emoji: '👨' },
  { value: 'curly',     label: '곱슬',    emoji: '🌀' },
  { value: 'twoblock',  label: '투블록',  emoji: '✂️' },
  { value: 'fade',      label: '페이드컷', emoji: '💈' },
  { value: 'medium',    label: '중단발',  emoji: '🧑' },
  { value: 'center',    label: '센터파트', emoji: '🎭' },
  { value: 'topknot',   label: '상투',    emoji: '🎎' },
  { value: 'longhair',  label: '긴머리',  emoji: '🧑‍🦱' },
  { value: 'bald',      label: '민머리',  emoji: '🧑‍🦲' },
]

export const FEMALE_HAIR_OPTIONS = [
  { value: 'bob',      label: '단발',    emoji: '💇‍♀️' },
  { value: 'long',     label: '장발',    emoji: '👩' },
  { value: 'wave',     label: '웨이브',  emoji: '〰️' },
  { value: 'ponytail', label: '포니테일', emoji: '🎀' },
  { value: 'bun',      label: '똥머리',  emoji: '🪮' },
  { value: 'straight', label: '칼단발',  emoji: '💁‍♀️' },
  { value: 'twin',     label: '양갈래',  emoji: '🎎' },
  { value: 'half_up',  label: '반묶음',  emoji: '🌸' },
  { value: 'braid',    label: '땋은머리', emoji: '🌿' },
]

// 머리 색상 팔레트 — hairStyle에 "+colorName" 추가로 적용 (예: "bob+bangs+blonde")
export const HAIR_COLOR_OPTIONS = [
  { value: 'black',    label: '블랙',    hex: '#18100a' },
  { value: 'brown',    label: '브라운',  hex: '#3b2a1a' },
  { value: 'chestnut', label: '밤색',    hex: '#7b4e32' },
  { value: 'blonde',   label: '금발',    hex: '#c9a227' },
  { value: 'platinum', label: '플래티넘', hex: '#e0c98a' },
  { value: 'auburn',   label: '오번',    hex: '#8b3a2a' },
  { value: 'gray',     label: '회색',    hex: '#8d949e' },
  { value: 'pink',     label: '핑크',    hex: '#e879a8' },
  { value: 'purple',   label: '보라',    hex: '#9333ea' },
  { value: 'blue',     label: '파랑',    hex: '#3b82f6' },
]

const HAIR_COLOR_MAP: Record<string, string> = Object.fromEntries(
  HAIR_COLOR_OPTIONS.map(o => [o.value, o.hex])
)
const DEFAULT_HAIR_COLOR = '#3b2a1a'

// ── 악세서리 옵션 ─────────────────────────────────────────────────────────────

export const EYE_MAKEUP_OPTIONS = [
  { value: 'none',      label: '없음',       emoji: '🚫' },
  { value: 'natural',   label: '내추럴',     emoji: '✨' },
  { value: 'cat_eye',   label: '캣아이',     emoji: '😸' },
  { value: 'smoky',     label: '스모키',     emoji: '🖤' },
  { value: 'colorful',  label: '컬러풀',     emoji: '🎨' },
  { value: 'glitter',   label: '글리터',     emoji: '💫' },
  { value: 'retro',     label: '레트로',     emoji: '🕶️' },
  { value: 'gradient',  label: '그라데이션', emoji: '🌸' },
  { value: 'innocent',  label: '청순',       emoji: '🌷' },
  { value: 'bold',      label: '볼드',       emoji: '💄' },
  { value: 'mono',      label: '모노리드',   emoji: '👁️' },
]

export const GLASSES_OPTIONS = [
  { value: 'none',       label: '없음',       emoji: '🚫' },
  { value: 'round',      label: '동그란',     emoji: '👓' },
  { value: 'square',     label: '사각',       emoji: '🔲' },
  { value: 'oval',       label: '타원',       emoji: '🔵' },
  { value: 'half_rim',   label: '반무테',     emoji: '🪩' },
  { value: 'rimless',    label: '무테',       emoji: '⬜' },
  { value: 'sun_aviator',label: '에비에이터', emoji: '🕶️' },
  { value: 'sun_wayfarer',label: '웨이퍼러',  emoji: '😎' },
  { value: 'sun_oversized',label: '오버사이즈',emoji: '🌟' },
  { value: 'sun_cat',    label: '캣선글라스', emoji: '😺' },
  { value: 'sun_round',  label: '동그란선글라스',emoji: '🔴' },
]

export const EARRING_OPTIONS = [
  { value: 'none',    label: '없음',   emoji: '🚫' },
  { value: 'stud',    label: '스터드', emoji: '🔵' },
  { value: 'hoop',    label: '후프',   emoji: '⭕' },
  { value: 'drop',    label: '드롭',   emoji: '💧' },
  { value: 'pearl',   label: '진주',   emoji: '🌕' },
  { value: 'star',    label: '별',     emoji: '⭐' },
  { value: 'heart',   label: '하트',   emoji: '❤️' },
  { value: 'flower',  label: '꽃',     emoji: '🌸' },
  { value: 'dangle',  label: '댕글',   emoji: '✨' },
  { value: 'cross',   label: '십자가', emoji: '✝️' },
  { value: 'chain',   label: '체인',   emoji: '🔗' },
]

export const NECKLACE_OPTIONS = [
  { value: 'none',    label: '없음',   emoji: '🚫' },
  { value: 'simple',  label: '심플체인',emoji: '➖' },
  { value: 'pearl',   label: '진주목걸이',emoji: '🌕' },
  { value: 'cross',   label: '십자가', emoji: '✝️' },
  { value: 'heart',   label: '하트',   emoji: '❤️' },
  { value: 'choker',  label: '초커',   emoji: '🖤' },
  { value: 'layered', label: '레이어드',emoji: '✨' },
  { value: 'star',    label: '별',     emoji: '⭐' },
  { value: 'flower',  label: '꽃',     emoji: '🌸' },
  { value: 'locket',  label: '로켓',   emoji: '💛' },
  { value: 'ribbon',  label: '리본',   emoji: '🎀' },
]

export const HAT_OPTIONS = [
  { value: 'none',        label: '없음',     emoji: '🚫' },
  { value: 'baseball',   label: '야구모자', emoji: '🧢' },
  { value: 'beanie',     label: '비니',     emoji: '🪖' },
  { value: 'fedora',     label: '페도라',   emoji: '🎩' },
  { value: 'cowboy',     label: '카우보이', emoji: '🤠' },
  { value: 'bucket',     label: '버킷햇',   emoji: '🪣' },
  { value: 'beret',      label: '베레모',   emoji: '🎨' },
  { value: 'santa',      label: '산타모자', emoji: '🎅' },
  { value: 'graduation', label: '학사모',   emoji: '🎓' },
  { value: 'chef',       label: '요리사모자',emoji: '👨‍🍳' },
  { value: 'crown',      label: '왕관',     emoji: '👑' },
]

/* ── 눈화장 (여성 전용) ── */
function EyeMakeup({ style }: { style: string }) {
  switch (style) {
    case 'natural':
      return <>
        <ellipse cx="43" cy="37" rx="5"   ry="2.2" fill="#c4a882" opacity="0.38" />
        <ellipse cx="57" cy="37" rx="5"   ry="2.2" fill="#c4a882" opacity="0.38" />
        <path d="M39 41 Q43 42 47 41"  stroke="#5c3d2e" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        <path d="M53 41 Q57 42 61 41"  stroke="#5c3d2e" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      </>
    case 'cat_eye':
      return <>
        <path d="M39 39 Q43 36.5 47 38.5 L49.5 35.5 L47.5 37.5" stroke="#111" strokeWidth="1.4" fill="#111" strokeLinecap="round" />
        <path d="M53 39 Q57 36.5 61 38.5 L63.5 35.5 L61.5 37.5" stroke="#111" strokeWidth="1.4" fill="#111" strokeLinecap="round" />
        <path d="M39 40.5 Q43 41.5 47 40.5" stroke="#111" strokeWidth="0.8" fill="none" />
        <path d="M53 40.5 Q57 41.5 61 40.5" stroke="#111" strokeWidth="0.8" fill="none" />
      </>
    case 'smoky':
      return <>
        <ellipse cx="43" cy="37.5" rx="6.5" ry="3.5" fill="#1e1e2e" opacity="0.55" />
        <ellipse cx="57" cy="37.5" rx="6.5" ry="3.5" fill="#1e1e2e" opacity="0.55" />
        <ellipse cx="43" cy="41"   rx="5"   ry="2"   fill="#1e1e2e" opacity="0.3"  />
        <ellipse cx="57" cy="41"   rx="5"   ry="2"   fill="#1e1e2e" opacity="0.3"  />
      </>
    case 'colorful':
      return <>
        <ellipse cx="43" cy="36.5" rx="6" ry="3"   fill="#a855f7" opacity="0.5"  />
        <ellipse cx="57" cy="36.5" rx="6" ry="3"   fill="#a855f7" opacity="0.5"  />
        <ellipse cx="43" cy="38.5" rx="4" ry="1.5" fill="#ec4899" opacity="0.45" />
        <ellipse cx="57" cy="38.5" rx="4" ry="1.5" fill="#ec4899" opacity="0.45" />
      </>
    case 'glitter':
      return <>
        <ellipse cx="43" cy="37" rx="5.5" ry="2.5" fill="#fbbf24" opacity="0.38" />
        <ellipse cx="57" cy="37" rx="5.5" ry="2.5" fill="#fbbf24" opacity="0.38" />
        {[40,43,46].map(x => <circle key={x}    cx={x}  cy="35" r="0.8" fill="#fef9c3" opacity="0.9" />)}
        {[54,57,60].map(x => <circle key={x+20} cx={x}  cy="35" r="0.8" fill="#fef9c3" opacity="0.9" />)}
      </>
    case 'retro':
      return <>
        <path d="M38 38.5 Q43 35.5 48 38.5" stroke="#111" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M52 38.5 Q57 35.5 62 38.5" stroke="#111" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M40 41  Q43 42.5 46 41"    stroke="#111" strokeWidth="1"   fill="none" />
        <path d="M54 41  Q57 42.5 60 41"    stroke="#111" strokeWidth="1"   fill="none" />
      </>
    case 'gradient':
      return <>
        <ellipse cx="41" cy="37" rx="3.5" ry="2.5" fill="#fbcfe8" opacity="0.5"  />
        <ellipse cx="55" cy="37" rx="3.5" ry="2.5" fill="#fbcfe8" opacity="0.5"  />
        <ellipse cx="46" cy="37" rx="4.5" ry="2.5" fill="#ec4899" opacity="0.55" />
        <ellipse cx="60" cy="37" rx="4.5" ry="2.5" fill="#ec4899" opacity="0.55" />
      </>
    case 'innocent':
      return <>
        <ellipse cx="43" cy="37" rx="5" ry="2" fill="#fce7f3" opacity="0.65" />
        <ellipse cx="57" cy="37" rx="5" ry="2" fill="#fce7f3" opacity="0.65" />
        <path d="M39 41 Q43 42 47 41"  stroke="#f9a8d4" strokeWidth="0.8" fill="none" />
        <path d="M53 41 Q57 42 61 41"  stroke="#f9a8d4" strokeWidth="0.8" fill="none" />
      </>
    case 'bold':
      return <>
        <path d="M38 39 Q43 35 48 39 L49.5 37" stroke="#0a0a0a" strokeWidth="2.2" fill="#0a0a0a" strokeLinecap="round" />
        <path d="M52 39 Q57 35 62 39 L63.5 37" stroke="#0a0a0a" strokeWidth="2.2" fill="#0a0a0a" strokeLinecap="round" />
        <path d="M39 41.5 Q43 43 47 41.5"  stroke="#0a0a0a" strokeWidth="1.4" fill="none" />
        <path d="M53 41.5 Q57 43 61 41.5"  stroke="#0a0a0a" strokeWidth="1.4" fill="none" />
      </>
    case 'mono':
      return <>
        <path d="M39 38.5 Q43 36 47 38.5" stroke="#3b2a1a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M53 38.5 Q57 36 61 38.5" stroke="#3b2a1a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </>
    default:
      return null
  }
}

/* ── 안경 (공용) ── */
/* ── 모자 ── */
function Hat({ style }: { style: string }) {
  if (style === 'none') return null
  switch (style) {
    case 'baseball':
      return <>
        <ellipse cx="50" cy="21" rx="18" ry="11" fill="#4a5568" />
        <circle cx="50" cy="11" r="2" fill="#2d3748" />
        <path d="M50 29 Q65 29 71 27 L70 31 Q58 34 50 33 Z" fill="#2d3748" />
      </>
    case 'beanie':
      return <>
        <ellipse cx="50" cy="18" rx="19" ry="13" fill="#e53e3e" />
        <rect x="31" y="27" width="38" height="6" rx="3" fill="#c53030" />
        <circle cx="50" cy="8" r="4" fill="#fc8181" />
      </>
    case 'fedora':
      return <>
        <ellipse cx="50" cy="27" rx="24" ry="4" fill="#744210" />
        <rect x="34" y="11" width="32" height="17" rx="4" fill="#92400e" />
        <line x1="34" y1="21" x2="66" y2="21" stroke="#78350f" strokeWidth="2" />
      </>
    case 'cowboy':
      return <>
        <path d="M24 27 Q50 34 76 27 Q70 31 50 32 Q30 31 24 27 Z" fill="#92400e" />
        <ellipse cx="50" cy="19" rx="17" ry="12" fill="#b45309" />
        <line x1="33" y1="25" x2="67" y2="25" stroke="#78350f" strokeWidth="2.5" />
      </>
    case 'bucket':
      return <>
        <path d="M33 15 Q31 28 29 30 Q40 34 60 34 Q71 30 67 30 Q69 16 67 15 Z" fill="#10b981" />
        <ellipse cx="50" cy="15" rx="17" ry="4" fill="#059669" />
        <ellipse cx="50" cy="30" rx="21" ry="4" fill="#059669" />
      </>
    case 'beret':
      return <>
        <ellipse cx="52" cy="17" rx="20" ry="10" fill="#7c3aed" />
        <ellipse cx="50" cy="24" rx="16" ry="3" fill="#5b21b6" />
        <circle cx="61" cy="12" r="2" fill="#5b21b6" />
      </>
    case 'santa':
      return <>
        <rect x="31" y="24" width="38" height="6" rx="3" fill="white" />
        <path d="M33 26 L45 5 L62 8 L68 26 Z" fill="#dc2626" />
        <circle cx="46" cy="4" r="4" fill="white" />
      </>
    case 'graduation':
      return <>
        <rect x="38" y="18" width="24" height="10" rx="2" fill="#1f2937" />
        <rect x="27" y="14" width="46" height="5" rx="1" fill="#111827" />
        <line x1="50" y1="14" x2="62" y2="23" stroke="#fbbf24" strokeWidth="1.5" />
        <circle cx="63" cy="24" r="2.5" fill="#fbbf24" />
      </>
    case 'chef':
      return <>
        <ellipse cx="50" cy="13" rx="16" ry="8" fill="white" stroke="#e5e7eb" strokeWidth="0.8" />
        <rect x="36" y="14" width="28" height="14" rx="2" fill="white" stroke="#e5e7eb" strokeWidth="0.8" />
        <rect x="36" y="26" width="28" height="3" rx="0" fill="#f3f4f6" />
      </>
    case 'crown':
      return <>
        <path d="M32 28 L32 18 L41 24 L50 12 L59 24 L68 18 L68 28 Z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
        <circle cx="50" cy="21" r="2.5" fill="#ef4444" />
        <circle cx="38.5" cy="23.5" r="1.5" fill="#3b82f6" />
        <circle cx="61.5" cy="23.5" r="1.5" fill="#10b981" />
      </>
    default:
      return null
  }
}

function Glasses({ style }: { style: string }) {
  if (style === 'none') return null

  // 선글라스 렌즈 색상
  const isSun = style.startsWith('sun_')
  const lensOpacity = isSun ? 0.82 : 0

  const LENS_COLOR: Record<string, string> = {
    sun_aviator:   '#4a5568',
    sun_wayfarer:  '#1a202c',
    sun_oversized: '#744210',
    sun_cat:       '#6b21a8',
    sun_round:     '#991b1b',
  }
  const lensColor = LENS_COLOR[style] ?? '#1a202c'

  switch (style) {
    case 'round':
    case 'sun_round':
      return <>
        {isSun && <>
          <circle cx="43" cy="39" r="5.5" fill={lensColor} opacity={lensOpacity} />
          <circle cx="57" cy="39" r="5.5" fill={lensColor} opacity={lensOpacity} />
        </>}
        <circle cx="43" cy="39" r="5.5" fill="none" stroke="#374151" strokeWidth="1.4" />
        <circle cx="57" cy="39" r="5.5" fill="none" stroke="#374151" strokeWidth="1.4" />
        <line x1="48.5" y1="39" x2="51.5" y2="39" stroke="#374151" strokeWidth="1.2" />
        <line x1="29"   y1="38" x2="37.5" y2="39" stroke="#374151" strokeWidth="1.2" />
        <line x1="62.5" y1="39" x2="71"   y2="38" stroke="#374151" strokeWidth="1.2" />
      </>
    case 'square':
    case 'sun_wayfarer':
      return <>
        {isSun && <>
          <rect x="37" y="34.5" width="12" height="9" rx="1.5" fill={lensColor} opacity={lensOpacity} />
          <rect x="51" y="34.5" width="12" height="9" rx="1.5" fill={lensColor} opacity={lensOpacity} />
        </>}
        <rect x="37" y="34.5" width="12" height="9" rx="1.5" fill="none" stroke="#374151" strokeWidth="1.4" />
        <rect x="51" y="34.5" width="12" height="9" rx="1.5" fill="none" stroke="#374151" strokeWidth="1.4" />
        <line x1="49"  y1="39" x2="51"  y2="39" stroke="#374151" strokeWidth="1.2" />
        <line x1="29"  y1="37" x2="37"  y2="38" stroke="#374151" strokeWidth="1.2" />
        <line x1="63"  y1="38" x2="71"  y2="37" stroke="#374151" strokeWidth="1.2" />
      </>
    case 'oval':
      return <>
        <ellipse cx="43" cy="39" rx="6" ry="4.5" fill="none" stroke="#374151" strokeWidth="1.4" />
        <ellipse cx="57" cy="39" rx="6" ry="4.5" fill="none" stroke="#374151" strokeWidth="1.4" />
        <line x1="49"  y1="39" x2="51"  y2="39" stroke="#374151" strokeWidth="1.2" />
        <line x1="29"  y1="38" x2="37"  y2="39" stroke="#374151" strokeWidth="1.2" />
        <line x1="63"  y1="39" x2="71"  y2="38" stroke="#374151" strokeWidth="1.2" />
      </>
    case 'half_rim':
      return <>
        <path d="M37.5 39 A6 5 0 0 1 48.5 39" stroke="#374151" strokeWidth="1.4" fill="none" />
        <path d="M51.5 39 A6 5 0 0 1 62.5 39" stroke="#374151" strokeWidth="1.4" fill="none" />
        <line x1="37.5" y1="39" x2="48.5" y2="39" stroke="#374151" strokeWidth="0.6" strokeDasharray="2 1" />
        <line x1="51.5" y1="39" x2="62.5" y2="39" stroke="#374151" strokeWidth="0.6" strokeDasharray="2 1" />
        <line x1="49"   y1="39" x2="51.5" y2="39" stroke="#374151" strokeWidth="1.2" />
        <line x1="29"   y1="38" x2="37.5" y2="39" stroke="#374151" strokeWidth="1.2" />
        <line x1="62.5" y1="39" x2="71"   y2="38" stroke="#374151" strokeWidth="1.2" />
      </>
    case 'rimless':
      return <>
        <ellipse cx="43" cy="39" rx="5.5" ry="4" fill="none" stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2 1.5" />
        <ellipse cx="57" cy="39" rx="5.5" ry="4" fill="none" stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2 1.5" />
        <line x1="48.5" y1="39" x2="51.5" y2="39" stroke="#94a3b8" strokeWidth="0.8" />
        <line x1="29"   y1="38" x2="37.5" y2="39" stroke="#94a3b8" strokeWidth="0.8" />
        <line x1="62.5" y1="39" x2="71"   y2="38" stroke="#94a3b8" strokeWidth="0.8" />
      </>
    case 'sun_aviator':
      return <>
        <ellipse cx="43" cy="39.5" rx="6"   ry="5.5" fill={lensColor} opacity={lensOpacity} />
        <ellipse cx="57" cy="39.5" rx="6"   ry="5.5" fill={lensColor} opacity={lensOpacity} />
        <ellipse cx="43" cy="39.5" rx="6"   ry="5.5" fill="none" stroke="#b45309" strokeWidth="1.4" />
        <ellipse cx="57" cy="39.5" rx="6"   ry="5.5" fill="none" stroke="#b45309" strokeWidth="1.4" />
        <path d="M37 36 Q43 33 49 36" stroke="#b45309" strokeWidth="1" fill="none" />
        <path d="M51 36 Q57 33 63 36" stroke="#b45309" strokeWidth="1" fill="none" />
        <line x1="49"  y1="38" x2="51"  y2="38" stroke="#b45309" strokeWidth="1.2" />
        <line x1="29"  y1="36" x2="37"  y2="38" stroke="#b45309" strokeWidth="1.2" />
        <line x1="63"  y1="38" x2="71"  y2="36" stroke="#b45309" strokeWidth="1.2" />
      </>
    case 'sun_oversized':
      return <>
        <ellipse cx="43" cy="40" rx="8"   ry="6.5" fill={lensColor} opacity={lensOpacity} />
        <ellipse cx="57" cy="40" rx="8"   ry="6.5" fill={lensColor} opacity={lensOpacity} />
        <ellipse cx="43" cy="40" rx="8"   ry="6.5" fill="none" stroke="#78350f" strokeWidth="1.6" />
        <ellipse cx="57" cy="40" rx="8"   ry="6.5" fill="none" stroke="#78350f" strokeWidth="1.6" />
        <line x1="51"  y1="39" x2="49"  y2="39" stroke="#78350f" strokeWidth="1.4" />
        <line x1="28"  y1="37" x2="35"  y2="39" stroke="#78350f" strokeWidth="1.4" />
        <line x1="65"  y1="39" x2="72"  y2="37" stroke="#78350f" strokeWidth="1.4" />
      </>
    case 'sun_cat':
      return <>
        <path d="M37 40 Q40 34 48 37 L48 43 Q43 45 37 43 Z" fill={lensColor} opacity={lensOpacity} />
        <path d="M51 40 Q54 34 62 37 L62 43 Q57 45 51 43 Z" fill={lensColor} opacity={lensOpacity} />
        <path d="M37 40 Q40 34 48 37 L48 43 Q43 45 37 43 Z" fill="none" stroke="#6b21a8" strokeWidth="1.4" />
        <path d="M51 40 Q54 34 62 37 L62 43 Q57 45 51 43 Z" fill="none" stroke="#6b21a8" strokeWidth="1.4" />
        <line x1="48"  y1="40" x2="51"  y2="40" stroke="#6b21a8" strokeWidth="1.2" />
        <line x1="29"  y1="39" x2="37"  y2="40" stroke="#6b21a8" strokeWidth="1.2" />
        <line x1="62"  y1="40" x2="71"  y2="39" stroke="#6b21a8" strokeWidth="1.2" />
      </>
    default:
      return null
  }
}

/* ── 귀걸이 (여성 전용) ── */
function Earring({ style }: { style: string }) {
  if (style === 'none') return null
  switch (style) {
    case 'stud':
      return <>
        <circle cx="32" cy="42" r="2"   fill="#fbbf24" />
        <circle cx="68" cy="42" r="2"   fill="#fbbf24" />
      </>
    case 'hoop':
      return <>
        <circle cx="32" cy="44" r="4"   fill="none" stroke="#d4af37" strokeWidth="1.8" />
        <circle cx="68" cy="44" r="4"   fill="none" stroke="#d4af37" strokeWidth="1.8" />
      </>
    case 'drop':
      return <>
        <line   x1="32" y1="42" x2="32" y2="49" stroke="#9ca3af"  strokeWidth="1" />
        <ellipse cx="32" cy="50" rx="2" ry="3" fill="#60a5fa" />
        <line   x1="68" y1="42" x2="68" y2="49" stroke="#9ca3af"  strokeWidth="1" />
        <ellipse cx="68" cy="50" rx="2" ry="3" fill="#60a5fa" />
      </>
    case 'pearl':
      return <>
        <circle cx="32" cy="43" r="2.5" fill="#f0f0f0" stroke="#e2e8f0" strokeWidth="0.5" />
        <circle cx="68" cy="43" r="2.5" fill="#f0f0f0" stroke="#e2e8f0" strokeWidth="0.5" />
      </>
    case 'star':
      return <>
        <text x="30" y="46" fontSize="6" fill="#fbbf24">★</text>
        <text x="66" y="46" fontSize="6" fill="#fbbf24">★</text>
      </>
    case 'heart':
      return <>
        <path d="M30 42 Q32 40 34 42 Q36 44 32 47 Q28 44 30 42 Z" fill="#f43f5e" transform="scale(0.7) translate(14,18)" />
        <path d="M30 42 Q32 40 34 42 Q36 44 32 47 Q28 44 30 42 Z" fill="#f43f5e" transform="scale(0.7) translate(62,18)" />
      </>
    case 'flower':
      return <>
        <circle cx="32" cy="44" r="1.5" fill="#fbbf24" />
        {[0,72,144,216,288].map(a => <ellipse key={a} cx={32+3*Math.cos(a*Math.PI/180)} cy={44+3*Math.sin(a*Math.PI/180)} rx="1.5" ry="1" fill="#f9a8d4" transform={`rotate(${a},${32+3*Math.cos(a*Math.PI/180)},${44+3*Math.sin(a*Math.PI/180)})`} />)}
        <circle cx="68" cy="44" r="1.5" fill="#fbbf24" />
        {[0,72,144,216,288].map(a => <ellipse key={a+10} cx={68+3*Math.cos(a*Math.PI/180)} cy={44+3*Math.sin(a*Math.PI/180)} rx="1.5" ry="1" fill="#f9a8d4" transform={`rotate(${a},${68+3*Math.cos(a*Math.PI/180)},${44+3*Math.sin(a*Math.PI/180)})`} />)}
      </>
    case 'dangle':
      return <>
        <line   x1="32" y1="42" x2="32" y2="46" stroke="#9ca3af" strokeWidth="1"  />
        <circle cx="32" cy="47" r="1.5" fill="#a855f7" />
        <line   x1="32" y1="48" x2="32" y2="52" stroke="#9ca3af" strokeWidth="1"  />
        <circle cx="32" cy="53" r="2"   fill="#ec4899" />
        <line   x1="68" y1="42" x2="68" y2="46" stroke="#9ca3af" strokeWidth="1"  />
        <circle cx="68" cy="47" r="1.5" fill="#a855f7" />
        <line   x1="68" y1="48" x2="68" y2="52" stroke="#9ca3af" strokeWidth="1"  />
        <circle cx="68" cy="53" r="2"   fill="#ec4899" />
      </>
    case 'cross':
      return <>
        <line x1="32" y1="41" x2="32" y2="48" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="30" y1="43" x2="34" y2="43" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="68" y1="41" x2="68" y2="48" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="66" y1="43" x2="70" y2="43" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" />
      </>
    case 'chain':
      return <>
        {[42,44,46,48,50].map(y => <circle key={y}    cx="32" cy={y} r="1.2" fill="none" stroke="#d4af37" strokeWidth="0.8" />)}
        {[42,44,46,48,50].map(y => <circle key={y+20} cx="68" cy={y} r="1.2" fill="none" stroke="#d4af37" strokeWidth="0.8" />)}
      </>
    default:
      return null
  }
}

/* ── 목걸이 (여성 전용) ── */
function Necklace({ style }: { style: string }) {
  if (style === 'none') return null
  switch (style) {
    case 'simple':
      return <path d="M36 60 Q50 68 64 60" stroke="#d4af37" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    case 'pearl':
      return <>
        <path d="M36 60 Q50 68 64 60" stroke="#d4d4d4" strokeWidth="0.7" fill="none" />
        {[36,40,44,48,50,52,56,60,64].map((x,i) => {
          const t = (i)/(8)
          const cx2 = 36 + (64-36)*t
          const cy2 = 60 + 8 * Math.sin(Math.PI * t)
          return <circle key={i} cx={cx2} cy={cy2} r="1.8" fill="#f5f5f5" stroke="#e2e8f0" strokeWidth="0.4" />
        })}
      </>
    case 'cross':
      return <>
        <path d="M38 59 Q50 66 62 59" stroke="#d4af37" strokeWidth="1.2" fill="none" />
        <line x1="50" y1="65" x2="50" y2="73" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="47" y1="68" x2="53" y2="68" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" />
      </>
    case 'heart':
      return <>
        <path d="M38 59 Q50 66 62 59" stroke="#f43f5e" strokeWidth="1.2" fill="none" />
        <path d="M48 65 Q50 63 52 65 Q54 67 50 71 Q46 67 48 65 Z" fill="#f43f5e" />
      </>
    case 'choker':
      return <path d="M34 58 Q50 63 66 58" stroke="#1e1b4b" strokeWidth="3" fill="none" strokeLinecap="round" />
    case 'layered':
      return <>
        <path d="M38 59 Q50 65 62 59" stroke="#d4af37" strokeWidth="1" fill="none" />
        <path d="M36 63 Q50 71 64 63" stroke="#9ca3af" strokeWidth="1" fill="none" />
        <circle cx="50" cy="70" r="2" fill="#fbbf24" />
      </>
    case 'star':
      return <>
        <path d="M38 59 Q50 66 62 59" stroke="#c0c0c0" strokeWidth="1.2" fill="none" />
        <text x="47" y="73" fontSize="7" fill="#fbbf24">★</text>
      </>
    case 'flower':
      return <>
        <path d="M38 59 Q50 66 62 59" stroke="#d4af37" strokeWidth="1.2" fill="none" />
        <circle cx="50" cy="68" r="2" fill="#fbbf24" />
        {[0,72,144,216,288].map(a => <ellipse key={a} cx={50+3.5*Math.cos(a*Math.PI/180)} cy={68+3.5*Math.sin(a*Math.PI/180)} rx="2" ry="1.2" fill="#f9a8d4" transform={`rotate(${a},${50+3.5*Math.cos(a*Math.PI/180)},${68+3.5*Math.sin(a*Math.PI/180)})`} />)}
      </>
    case 'locket':
      return <>
        <path d="M38 59 Q50 66 62 59" stroke="#d4af37" strokeWidth="1.2" fill="none" />
        <rect x="47" y="64" width="6" height="7" rx="3" fill="#d4af37" />
        <circle cx="50" cy="67.5" r="1.5" fill="#fef9c3" opacity="0.7" />
      </>
    case 'ribbon':
      return <>
        <path d="M38 59 Q50 65 62 59" stroke="#f9a8d4" strokeWidth="1.2" fill="none" />
        <path d="M47 64 L50 68 L53 64 L56 66 L50 70 L44 66 Z" fill="#f472b6" opacity="0.85" />
      </>
    default:
      return null
  }
}

/* ── 남성 헤어 베이스 ── */
function MaleHair({ style, c }: { style: string; c: string }) {
  switch (style) {
    case 'short':
      return <ellipse cx="50" cy="27" rx="21" ry="13" fill={c} />
    case 'sports':
      return <ellipse cx="50" cy="29" rx="21" ry="9" fill={c} />
    case 'slickback':
      return <>
        <ellipse cx="50" cy="26" rx="21" ry="14" fill={c} />
        <path d="M29 28 Q50 18 71 28" stroke={c} strokeWidth="5" fill="none" strokeLinecap="round" />
      </>
    case 'sidepart':
      return <>
        <ellipse cx="50" cy="27" rx="21" ry="13" fill={c} />
        <line x1="37" y1="19" x2="37" y2="34" stroke="#6b5543" strokeWidth="2" />
      </>
    case 'curly':
      return <>
        <ellipse cx="50" cy="27" rx="23" ry="15" fill={c} />
        <circle cx="31" cy="29" r="8" fill={c} />
        <circle cx="69" cy="29" r="8" fill={c} />
        <circle cx="50" cy="15" r="8" fill={c} />
      </>
    case 'twoblock':
      return <>
        <ellipse cx="50" cy="25" rx="21" ry="15" fill={c} />
        <rect x="29" y="30" width="7" height="10" rx="3" fill={c} opacity="0.55" />
        <rect x="64" y="30" width="7" height="10" rx="3" fill={c} opacity="0.55" />
      </>
    case 'fade':
      return <>
        <ellipse cx="50" cy="27" rx="21" ry="13" fill={c} />
        <rect x="29" y="29" width="7" height="8"  rx="3" fill={c} opacity="0.5" />
        <rect x="64" y="29" width="7" height="8"  rx="3" fill={c} opacity="0.5" />
        <rect x="29" y="37" width="7" height="5"  rx="3" fill={c} opacity="0.22" />
        <rect x="64" y="37" width="7" height="5"  rx="3" fill={c} opacity="0.22" />
      </>
    case 'medium':
      return <>
        <ellipse cx="50" cy="27" rx="21" ry="13" fill={c} />
        <rect x="29" y="30" width="8" height="16" rx="5" fill={c} />
        <rect x="63" y="30" width="8" height="16" rx="5" fill={c} />
      </>
    case 'center':
      return <>
        <ellipse cx="50" cy="27" rx="21" ry="13" fill={c} />
        <rect x="29" y="30" width="8" height="16" rx="5" fill={c} />
        <rect x="63" y="30" width="8" height="16" rx="5" fill={c} />
        <line x1="50" y1="18" x2="50" y2="33" stroke="#6b5543" strokeWidth="2" />
        <path d="M39 28 Q33 34 33 40" stroke={c} strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M61 28 Q67 34 67 40" stroke={c} strokeWidth="5" fill="none" strokeLinecap="round" />
      </>
    case 'topknot':
      return <>
        <ellipse cx="50" cy="30" rx="20" ry="9" fill={c} />
        <ellipse cx="50" cy="18" rx="9" ry="7" fill={c} />
        <rect x="45" y="24" width="10" height="4" rx="2" fill="#6b5543" />
      </>
    case 'longhair':
      // 턱까지 내려오는 긴머리
      return <>
        <ellipse cx="50" cy="25" rx="21" ry="14" fill={c} />
        {/* 양쪽 옆머리 — 턱(y≈62)까지 */}
        <rect x="29" y="31" width="8" height="30" rx="4" fill={c} />
        <rect x="63" y="31" width="8" height="30" rx="4" fill={c} />
        {/* 뒷머리 */}
        <rect x="37" y="27" width="26" height="5" rx="3" fill={c} opacity="0.85" />
      </>
    case 'bald':
      return null
    default:
      return <ellipse cx="50" cy="27" rx="21" ry="13" fill={c} />
  }
}

/* ── 여성 헤어 베이스 ── */
function FemaleHair({ style, c }: { style: string; c: string }) {
  switch (style) {
    case 'bob':
      return <>
        <ellipse cx="50" cy="26" rx="22" ry="16" fill={c} />
        <rect x="28" y="34" width="9" height="18" rx="5" fill={c} />
        <rect x="63" y="34" width="9" height="18" rx="5" fill={c} />
      </>
    case 'long':
      return <>
        <ellipse cx="50" cy="25" rx="22" ry="16" fill={c} />
        <rect x="28" y="33" width="9" height="42" rx="5" fill={c} />
        <rect x="63" y="33" width="9" height="42" rx="5" fill={c} />
      </>
    case 'wave':
      return <>
        <ellipse cx="50" cy="25" rx="22" ry="16" fill={c} />
        <path d="M28 40 Q23 52 28 62 Q33 72 28 82" stroke={c} strokeWidth="10" fill="none" strokeLinecap="round" />
        <path d="M72 40 Q77 52 72 62 Q67 72 72 82" stroke={c} strokeWidth="10" fill="none" strokeLinecap="round" />
      </>
    case 'ponytail':
      return <>
        <ellipse cx="50" cy="26" rx="22" ry="16" fill={c} />
        <rect x="63" y="16" width="9" height="30" rx="4" fill={c} />
        <ellipse cx="68" cy="48" rx="7" ry="10" fill={c} />
      </>
    case 'bun':
      // 똥머리
      return <>
        <ellipse cx="50" cy="28" rx="21" ry="15" fill={c} />
        <ellipse cx="50" cy="13" rx="10" ry="8" fill={c} />
        <circle  cx="50" cy="13" r="5"          fill={c} opacity="0.6" />
      </>
    case 'straight':
      // 칼단발 — 어깨 길이 일자 컷
      return <>
        <ellipse cx="50" cy="25" rx="22" ry="16" fill={c} />
        <rect x="28" y="33" width="9" height="30" rx="3" fill={c} />
        <rect x="63" y="33" width="9" height="30" rx="3" fill={c} />
        {/* 일자 바닥선 */}
        <rect x="28" y="61" width="9" height="3" rx="1" fill={c} />
        <rect x="63" y="61" width="9" height="3" rx="1" fill={c} />
      </>
    case 'twin':
      // 양갈래 트윈테일
      return <>
        <ellipse cx="50" cy="26" rx="22" ry="16" fill={c} />
        <path d="M30 26 Q19 38 21 58 Q23 68 26 76" stroke={c} strokeWidth="11" fill="none" strokeLinecap="round" />
        <path d="M70 26 Q81 38 79 58 Q77 68 74 76" stroke={c} strokeWidth="11" fill="none" strokeLinecap="round" />
        <circle cx="24" cy="31" r="4" fill="#ec4899" />
        <circle cx="76" cy="31" r="4" fill="#ec4899" />
      </>
    case 'half_up':
      // 반묶음
      return <>
        <ellipse cx="50" cy="25" rx="22" ry="16" fill={c} />
        <rect x="28" y="35" width="9" height="36" rx="5" fill={c} />
        <rect x="63" y="35" width="9" height="36" rx="5" fill={c} />
        <ellipse cx="50" cy="17" rx="13" ry="7" fill={c} />
        <ellipse cx="50" cy="15" rx="6"  ry="5" fill={c} />
        <circle  cx="50" cy="14" r="3"          fill="#f9a8d4" />
      </>
    case 'braid':
      // 땋은머리 — 왼쪽 어깨 옆으로 내려옴
      return <>
        <ellipse cx="50" cy="25" rx="22" ry="16" fill={c} />
        {/* 왼쪽 옆머리 (땋기 연결) */}
        <rect x="28" y="33" width="9" height="30" rx="5" fill={c} />
        {/* 오른쪽 짧은 커튼 */}
        <rect x="63" y="33" width="9" height="14" rx="5" fill={c} />
        {/* 땋은 줄기 — 왼쪽 어깨 방향 */}
        <path d="M30 62 Q18 70 20 84" stroke={c} strokeWidth="9" fill="none" strokeLinecap="round" />
        {/* 땋음 패턴 */}
        <path d="M26 64 Q33 70 26 76 Q33 82 27 86" stroke="#6b5543" strokeWidth="1.5" fill="none" opacity="0.6" />
        <path d="M33 64 Q26 70 33 76 Q26 82 32 86" stroke="#6b5543" strokeWidth="1.5" fill="none" opacity="0.6" />
        {/* 끝 리본 */}
        <circle cx="20" cy="85" r="3" fill="#f9a8d4" />
      </>
    default:
      return <ellipse cx="50" cy="26" rx="22" ry="16" fill={c} />
  }
}

/* ── 앞머리 오버레이 (얼굴 위에 렌더) ── */
function BangsOverlay({ gender, c }: { gender: Gender; c: string }) {
  if (gender === 'female') {
    // 여성 앞머리 — 이마 상단부터 눈썹 위까지
    return (
      <path
        d="M30 19 L70 19 Q70 33 50 32 Q30 33 30 19 Z"
        fill={c}
      />
    )
  }
  // 남성 앞머리 — 이마 상단부터
  return (
    <path
      d="M32 21 L68 21 Q68 33 50 32 Q32 33 32 21 Z"
      fill={c}
    />
  )
}

/* ── 몸 / 의상 ── */
function Body({ outfit, gender }: { outfit: Outfit; gender: Gender }) {
  if (outfit === 'pastor') {
    return <>
      <path d="M18 66 Q34 59 50 61 Q66 59 82 66 L86 100 H14 Z" fill="#0f172a" />
      <line x1="50" y1="62" x2="50" y2="99" stroke="#1e293b" strokeWidth="2.5" />
      <path d="M18 70 Q14 80 12 92" stroke="#1e293b" strokeWidth="3" fill="none" />
      <path d="M82 70 Q86 80 88 92" stroke="#1e293b" strokeWidth="3" fill="none" />
      <rect x="41" y="55" width="18" height="13" rx="2" fill="#f8fafc" />
      <rect x="45" y="55" width="10" height="6"  rx="1" fill="#0f172a" />
      <path d="M47 63 L43 98" stroke="#7c3aed" strokeWidth="5" strokeLinecap="round" />
      <path d="M53 63 L57 98" stroke="#7c3aed" strokeWidth="5" strokeLinecap="round" />
      <rect x="48" y="74" width="4" height="12" rx="1" fill="#fbbf24" />
      <rect x="44" y="77" width="12" height="4"  rx="1" fill="#fbbf24" />
    </>
  }

  if (outfit === 'hanbok') {
    return gender === 'female' ? <>
      <ellipse cx="50" cy="89" rx="32" ry="13" fill="#ec4899" />
      <rect x="18" y="76" width="64" height="16" rx="4" fill="#ec4899" />
      <path d="M30 63 Q50 58 70 63 L67 78 Q50 82 33 78 Z" fill="#fde68a" />
      <path d="M46 67 Q50 73 54 67" stroke="#f97316" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </> : <>
      <rect x="33" y="75" width="13" height="27" rx="5" fill="#1d4ed8" />
      <rect x="54" y="75" width="13" height="27" rx="5" fill="#1d4ed8" />
      <path d="M28 63 Q50 57 72 63 L68 78 Q50 82 32 78 Z" fill="#bae6fd" />
      <path d="M46 67 Q50 73 54 67" stroke="#1d4ed8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>
  }

  if (outfit === 'hoodie') {
    return <>
      <ellipse cx="50" cy="83" rx="28" ry="17" fill="#4b5563" />
      {/* 라운드 넥 */}
      <path d="M40 64 Q50 70 60 64" stroke="#374151" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {/* 캥거루 주머니 */}
      <rect x="36" y="77" width="28" height="10" rx="4" fill="#374151" opacity="0.45" />
      {/* 드로스트링 */}
      <line x1="46" y1="65" x2="44" y2="77" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="54" y1="65" x2="56" y2="77" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
    </>
  }

  if (outfit === 'shirt') {
    return <>
      <ellipse cx="50" cy="83" rx="28" ry="17" fill="#bfdbfe" />
      {/* 카라 (양쪽 칼라 포인트) */}
      <path d="M44 65 L50 72 L56 65 L52 62 L50 66 L48 62 Z" fill="#f0f9ff" />
      {/* 단추 줄 */}
      <line x1="50" y1="68" x2="50" y2="95" stroke="#93c5fd" strokeWidth="1" />
      <circle cx="50" cy="72" r="1.5" fill="#60a5fa" />
      <circle cx="50" cy="79" r="1.5" fill="#60a5fa" />
      <circle cx="50" cy="86" r="1.5" fill="#60a5fa" />
    </>
  }

  if (outfit === 'blouse') {
    return <>
      <ellipse cx="50" cy="83" rx="28" ry="17" fill="#fce7f3" />
      {/* 피터팬 칼라 */}
      <ellipse cx="50" cy="66" rx="14" ry="6" fill="#f9a8d4" opacity="0.75" />
      <ellipse cx="50" cy="66" rx="9"  ry="4" fill="#fce7f3" />
      {/* 리본 */}
      <path d="M46 66 L44 63 L50 66 L56 63 L54 66" fill="#f9a8d4" />
      <circle cx="50" cy="66" r="2.2" fill="#ec4899" opacity="0.8" />
      {/* 퍼프 소매 느낌 */}
      <ellipse cx="24" cy="73" rx="7" ry="5" fill="#fce7f3" />
      <ellipse cx="76" cy="73" rx="7" ry="5" fill="#fce7f3" />
    </>
  }

  if (outfit === 'sweater') {
    return <>
      <ellipse cx="50" cy="83" rx="28" ry="17" fill="#7c2d12" />
      {/* 라운드 넥 립 */}
      <path d="M38 63 Q50 70 62 63" stroke="#9a3412" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M38 63 Q50 70 62 63" stroke="#fca5a5" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5" />
      {/* 소매 립 */}
      <line x1="20" y1="80" x2="24" y2="80" stroke="#9a3412" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="76" y1="80" x2="80" y2="80" stroke="#9a3412" strokeWidth="2.5" strokeLinecap="round" />
    </>
  }

  if (outfit === 'vest') {
    return <>
      {/* 안에 입은 셔츠 */}
      <ellipse cx="50" cy="83" rx="28" ry="17" fill="#f1f5f9" />
      {/* 조끼 왼쪽 */}
      <path d="M22 68 Q34 63 44 65 L44 100 H22 Z" fill="#1e3a5f" />
      {/* 조끼 오른쪽 */}
      <path d="M78 68 Q66 63 56 65 L56 100 H78 Z" fill="#1e3a5f" />
      {/* 셔츠 칼라 */}
      <path d="M44 65 L50 72 L56 65" stroke="#94a3b8" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* 조끼 단추 */}
      <circle cx="50" cy="73" r="2" fill="#1e3a5f" />
      <circle cx="50" cy="81" r="2" fill="#1e3a5f" />
      <circle cx="50" cy="89" r="2" fill="#1e3a5f" />
    </>
  }

  const OUTFIT_CFG: Record<string, { body: string; collar: string }> = {
    casual:       { body: '#6366f1', collar: '#e0e7ff' },
    formal:       { body: '#1e293b', collar: '#f8fafc' },
    worship_team: { body: '#7c3aed', collar: '#ddd6fe' },
    hanbok:       { body: '#ec4899', collar: '#fde68a' },
    pastor:       { body: '#0f172a', collar: '#f8fafc' },
  }
  const { body, collar } = OUTFIT_CFG[outfit] ?? OUTFIT_CFG.casual

  return <>
    <ellipse cx="50" cy="83" rx="28" ry="17" fill={body} />
    <polygon points="44,67 50,76 56,67" fill={collar} />
    {outfit === 'formal' && (
      <path d="M50 70 L48 84 L50 87 L52 84 Z" fill="#dc2626" />
    )}
  </>
}

interface Props {
  skinTone:  SkinTone
  gender:    Gender
  hairStyle: string   // "base" 또는 "base+bangs+color" 형식
  outfit:    Outfit
  size?:     number   // 정사각형일 때 (기본값)
  svgWidth?: number   // 개별 지정 시 (비정방형)
  svgHeight?: number
  faceOnly?: boolean
  upperBody?: boolean // 얼굴+상반신 표시 (교제광장 마커용)
  eyeMakeup?: string
  glasses?:   string
  earring?:   string
  necklace?:  string
  hat?:       string
}

export default function AvatarPreview({
  skinTone, gender, hairStyle, outfit, size = 120,
  svgWidth, svgHeight, faceOnly = false, upperBody = false,
  eyeMakeup = 'none', glasses = 'none', earring = 'none', necklace = 'none', hat = 'none',
}: Props) {
  const skin = SKIN[skinTone] ?? SKIN.medium
  const w    = svgWidth  ?? size
  const h    = svgHeight ?? size
  // upperBody: 머리 꼭대기(y=5) ~ 칼라/상의(y=81) — 세로 타원 마커용
  const viewBox = faceOnly  ? '20 8 60 60'
                : upperBody ? '8 5 84 92'
                :              '0 0 100 100'
  const preserveAR = upperBody ? 'xMidYMid slice' : 'xMidYMid meet'

  // "bob+bangs+blonde" → baseStyle="bob", hasBangs=true, hairColor="#c9a227"
  const parts     = hairStyle.split('+')
  const baseStyle = parts[0] ?? 'short'
  const hasBangs  = parts.includes('bangs')
  const colorSeg  = parts.find(s => s in HAIR_COLOR_MAP)
  const hc        = colorSeg ? HAIR_COLOR_MAP[colorSeg] : DEFAULT_HAIR_COLOR

  return (
    <svg width={w} height={h} viewBox={viewBox} preserveAspectRatio={preserveAR}
         xmlns="http://www.w3.org/2000/svg" aria-label="아바타 미리보기">
      {/* 몸 */}
      <Body outfit={outfit} gender={gender} />

      {/* 목 */}
      <rect x="43" y="57" width="14" height="12" rx="4" fill={skin} />

      {/* 헤어 베이스 (얼굴 뒤) */}
      {gender === 'male'
        ? <MaleHair   style={baseStyle} c={hc} />
        : <FemaleHair style={baseStyle} c={hc} />}

      {/* 얼굴 */}
      <ellipse cx="50" cy="40"
        rx={gender === 'female' ? 18 : 19}
        ry={gender === 'female' ? 22 : 21}
        fill={skin} />

      {/* 앞머리 오버레이 (얼굴 위, 눈썹 아래에 렌더) */}
      {hasBangs && <BangsOverlay gender={gender} c={hc} />}

      {/* 눈썹 */}
      {gender === 'male' ? <>
        <path d="M40 32 Q43 30 46 32" stroke="#3b2a1a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M54 32 Q57 30 60 32" stroke="#3b2a1a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </> : <>
        <path d="M41.7 31 Q43 30 44.3 31" stroke="#3b2a1a" strokeWidth="0.5" fill="none" strokeLinecap="round" />
        <path d="M55.7 31 Q57 30 58.3 31" stroke="#3b2a1a" strokeWidth="0.5" fill="none" strokeLinecap="round" />
      </>}

      {/* 눈 */}
      <circle cx="43" cy="39" r="2.8" fill="#1e293b" />
      <circle cx="57" cy="39" r="2.8" fill="#1e293b" />
      <circle cx="44" cy="38" r="1"   fill="#fff" />
      <circle cx="58" cy="38" r="1"   fill="#fff" />

      {/* 눈화장 (여성) */}
      {gender === 'female' && <EyeMakeup style={eyeMakeup} />}

      {/* 여성 속눈썹 */}
      {gender === 'female' && <>
        <path d="M40 36 L38 33" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M43 35 L42 32" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M46 36 L46 33" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M54 36 L54 33" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M57 35 L58 32" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M60 36 L62 33" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
      </>}

      {/* 귀걸이 (여성) */}
      {gender === 'female' && <Earring style={earring} />}

      {/* 코 */}
      <ellipse cx="50" cy="46" rx="2" ry="1.5" fill={skin} stroke="#c9956a" strokeWidth="0.8" />

      {/* 입 */}
      {gender === 'female'
        ? <path d="M44 52 Q50 57 56 52" stroke="#e07b8a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        : <path d="M44 52 Q50 56 56 52" stroke="#b07070" strokeWidth="1.6" fill="none" strokeLinecap="round" />}

      {/* 볼터치 (여성) */}
      {gender === 'female' && <>
        <circle cx="37" cy="46" r="5" fill="#f9a8a8" opacity="0.45" />
        <circle cx="63" cy="46" r="5" fill="#f9a8a8" opacity="0.45" />
      </>}

      {/* 모자 */}
      <Hat style={hat} />

      {/* 안경 */}
      <Glasses style={glasses} />

      {/* 목걸이 (여성) */}
      {gender === 'female' && <Necklace style={necklace} />}
    </svg>
  )
}
