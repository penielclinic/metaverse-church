'use client'

const SKIN: Record<string, string> = {
  light: '#FDDBB4', medium: '#F0C27F', tan: '#D4915A', dark: '#8D5524',
}

export type SkinTone = 'light' | 'medium' | 'tan' | 'dark'
export type Gender  = 'male' | 'female'
export type Outfit  = 'casual' | 'formal' | 'hanbok' | 'worship_team' | 'pastor'

export const MALE_HAIR_OPTIONS = [
  { value: 'short',     label: '단발',   emoji: '💇‍♂️' },
  { value: 'sports',    label: '스포츠컷', emoji: '🏃' },
  { value: 'slickback', label: '올백',   emoji: '🕴️' },
  { value: 'sidepart',  label: '가르마', emoji: '👨' },
  { value: 'curly',     label: '곱슬',   emoji: '🌀' },
  { value: 'bald',      label: '민머리', emoji: '🧑‍🦲' },
]

export const FEMALE_HAIR_OPTIONS = [
  { value: 'bob',       label: '단발',   emoji: '💇‍♀️' },
  { value: 'long',      label: '장발',   emoji: '👩' },
  { value: 'wave',      label: '웨이브', emoji: '〰️' },
  { value: 'ponytail',  label: '포니테일', emoji: '🎀' },
  { value: 'bun',       label: '업스타일', emoji: '🪮' },
  { value: 'bangs',     label: '앞머리', emoji: '✂️' },
]

const HAIR_COLOR = '#3b2a1a'

/* ── 남성 헤어 ── */
function MaleHair({ style }: { style: string }) {
  const c = HAIR_COLOR
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
    case 'bald':
      return null
    default:
      return <ellipse cx="50" cy="27" rx="21" ry="13" fill={c} />
  }
}

/* ── 여성 헤어 ── */
function FemaleHair({ style }: { style: string }) {
  const c = HAIR_COLOR
  switch (style) {
    case 'bob':
      return <>
        <ellipse cx="50" cy="26" rx="22" ry="16" fill={c} />
        <rect x="28" y="34" width="9"  height="18" rx="5" fill={c} />
        <rect x="63" y="34" width="9"  height="18" rx="5" fill={c} />
      </>
    case 'long':
      return <>
        <ellipse cx="50" cy="25" rx="22" ry="16" fill={c} />
        <rect x="28" y="33" width="9"  height="42" rx="5" fill={c} />
        <rect x="63" y="33" width="9"  height="42" rx="5" fill={c} />
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
        <rect x="63" y="16" width="9"  height="30" rx="4" fill={c} />
        <ellipse cx="68" cy="48" rx="7" ry="10" fill={c} />
      </>
    case 'bun':
      return <>
        <ellipse cx="50" cy="28" rx="21" ry="15" fill={c} />
        <ellipse cx="50" cy="13" rx="10" ry="8"  fill={c} />
        <circle  cx="50" cy="13" r="5"           fill={c} opacity="0.6" />
      </>
    case 'bangs':
      return <>
        <ellipse cx="50" cy="26" rx="22" ry="16" fill={c} />
        <rect x="28" y="33" width="9"  height="32" rx="5" fill={c} />
        <rect x="63" y="33" width="9"  height="32" rx="5" fill={c} />
        <rect x="29" y="28" width="42" height="11" rx="4" fill={c} />
      </>
    default:
      return <ellipse cx="50" cy="26" rx="22" ry="16" fill={c} />
  }
}

/* ── 몸 / 의상 ── */
function Body({ outfit, gender }: { outfit: Outfit; gender: Gender; skin?: string }) {
  if (outfit === 'pastor') {
    return <>
      {/* 검은 가운 */}
      <path d="M18 66 Q34 59 50 61 Q66 59 82 66 L86 100 H14 Z" fill="#0f172a" />
      {/* 가운 중앙 선 */}
      <line x1="50" y1="62" x2="50" y2="99" stroke="#1e293b" strokeWidth="2.5" />
      {/* 소매 주름 */}
      <path d="M18 70 Q14 80 12 92" stroke="#1e293b" strokeWidth="3" fill="none" />
      <path d="M82 70 Q86 80 88 92" stroke="#1e293b" strokeWidth="3" fill="none" />
      {/* 흰색 클레리컬 칼라 */}
      <rect x="41" y="55" width="18" height="13" rx="2" fill="#f8fafc" />
      <rect x="45" y="55" width="10" height="6"  rx="1" fill="#0f172a" />
      {/* 영대(stole) — 보라 */}
      <path d="M47 63 L43 98" stroke="#7c3aed" strokeWidth="5" strokeLinecap="round" />
      <path d="M53 63 L57 98" stroke="#7c3aed" strokeWidth="5" strokeLinecap="round" />
      {/* 금 십자가 */}
      <rect x="48" y="74" width="4" height="12" rx="1" fill="#fbbf24" />
      <rect x="44" y="77" width="12" height="4"  rx="1" fill="#fbbf24" />
    </>
  }

  if (outfit === 'hanbok') {
    return gender === 'female' ? <>
      {/* 치마 */}
      <ellipse cx="50" cy="89" rx="32" ry="13" fill="#ec4899" />
      <rect x="18" y="76" width="64" height="16" rx="4" fill="#ec4899" />
      {/* 저고리 */}
      <path d="M30 63 Q50 58 70 63 L67 78 Q50 82 33 78 Z" fill="#fde68a" />
      {/* 고름 */}
      <path d="M46 67 Q50 73 54 67" stroke="#f97316" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </> : <>
      {/* 바지 */}
      <rect x="33" y="75" width="13" height="27" rx="5" fill="#1d4ed8" />
      <rect x="54" y="75" width="13" height="27" rx="5" fill="#1d4ed8" />
      {/* 저고리 */}
      <path d="M28 63 Q50 57 72 63 L68 78 Q50 82 32 78 Z" fill="#bae6fd" />
      {/* 고름 */}
      <path d="M46 67 Q50 73 54 67" stroke="#1d4ed8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>
  }

  const OUTFIT_CFG: Record<Outfit, { body: string; collar: string }> = {
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
  skinTone: SkinTone
  gender: Gender
  hairStyle: string
  outfit: Outfit
  size?: number
  faceOnly?: boolean
}

export default function AvatarPreview({
  skinTone, gender, hairStyle, outfit, size = 120, faceOnly = false,
}: Props) {
  const skin = SKIN[skinTone] ?? SKIN.medium
  const viewBox = faceOnly ? '20 8 60 60' : '0 0 100 100'

  return (
    <svg width={size} height={size} viewBox={viewBox}
         xmlns="http://www.w3.org/2000/svg" aria-label="아바타 미리보기">
      {/* 몸 */}
      <Body outfit={outfit} gender={gender} />

      {/* 목 */}
      <rect x="43" y="57" width="14" height="12" rx="4" fill={skin} />

      {/* 헤어 (머리 뒤) */}
      {gender === 'male'
        ? <MaleHair   style={hairStyle} />
        : <FemaleHair style={hairStyle} />}

      {/* 얼굴 */}
      <ellipse cx="50" cy="40"
        rx={gender === 'female' ? 18 : 19}
        ry={gender === 'female' ? 22 : 21}
        fill={skin} />

      {/* 눈썹 */}
      {gender === 'male' ? <>
        <path d="M40 32 Q43 30 46 32" stroke="#3b2a1a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M54 32 Q57 30 60 32" stroke="#3b2a1a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </> : <>
        <path d="M39 31 Q43 28 47 31" stroke="#3b2a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M53 31 Q57 28 61 31" stroke="#3b2a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </>}

      {/* 눈 */}
      <circle cx="43" cy="39" r="2.8" fill="#1e293b" />
      <circle cx="57" cy="39" r="2.8" fill="#1e293b" />
      <circle cx="44" cy="38" r="1"   fill="#fff" />
      <circle cx="58" cy="38" r="1"   fill="#fff" />

      {/* 여성 속눈썹 */}
      {gender === 'female' && <>
        <path d="M40 36 L38 33" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M43 35 L42 32" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M46 36 L46 33" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M54 36 L54 33" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M57 35 L58 32" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M60 36 L62 33" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
      </>}

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
    </svg>
  )
}
