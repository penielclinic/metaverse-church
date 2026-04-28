'use client'

const SKIN: Record<string, string> = {
  light: '#FDDBB4', medium: '#F0C27F', tan: '#D4915A', dark: '#8D5524',
}

export type SkinTone = 'light' | 'medium' | 'tan' | 'dark'
export type Gender  = 'male' | 'female'
export type Outfit  = 'casual' | 'formal' | 'hanbok' | 'worship_team' | 'pastor'

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
  { value: 'bald',      label: '민머리',  emoji: '🧑‍🦲' },
]

export const FEMALE_HAIR_OPTIONS = [
  { value: 'bob',       label: '단발',    emoji: '💇‍♀️' },
  { value: 'long',      label: '장발',    emoji: '👩' },
  { value: 'wave',      label: '웨이브',  emoji: '〰️' },
  { value: 'ponytail',  label: '포니테일', emoji: '🎀' },
  { value: 'bun',       label: '업스타일', emoji: '🪮' },
  { value: 'straight',  label: '생머리',  emoji: '💁‍♀️' },
  { value: 'twin',      label: '양갈래',  emoji: '🎎' },
  { value: 'half_up',   label: '반묶음',  emoji: '🌸' },
  { value: 'pixie',     label: '픽시컷',  emoji: '✨' },
  { value: 'braid',     label: '땋은머리', emoji: '🌿' },
]

// 머리 색상 팔레트 — hairStyle에 "+colorName" 추가로 적용 (예: "bob+bangs+blonde")
export const HAIR_COLOR_OPTIONS = [
  { value: 'black',    label: '블랙',   hex: '#18100a' },
  { value: 'brown',    label: '브라운', hex: '#3b2a1a' },
  { value: 'chestnut', label: '밤색',   hex: '#7b4e32' },
  { value: 'blonde',   label: '금발',   hex: '#c9a227' },
  { value: 'platinum', label: '플래티넘', hex: '#e0c98a' },
  { value: 'auburn',   label: '오번',   hex: '#8b3a2a' },
  { value: 'gray',     label: '회색',   hex: '#8d949e' },
  { value: 'pink',     label: '핑크',   hex: '#e879a8' },
  { value: 'purple',   label: '보라',   hex: '#9333ea' },
  { value: 'blue',     label: '파랑',   hex: '#3b82f6' },
]

const HAIR_COLOR_MAP: Record<string, string> = Object.fromEntries(
  HAIR_COLOR_OPTIONS.map(o => [o.value, o.hex])
)
const DEFAULT_HAIR_COLOR = '#3b2a1a'

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
        {/* 긴 윗머리 */}
        <ellipse cx="50" cy="25" rx="21" ry="15" fill={c} />
        {/* 짧은 옆머리 */}
        <rect x="29" y="30" width="7" height="10" rx="3" fill={c} opacity="0.55" />
        <rect x="64" y="30" width="7" height="10" rx="3" fill={c} opacity="0.55" />
      </>
    case 'fade':
      return <>
        <ellipse cx="50" cy="27" rx="21" ry="13" fill={c} />
        {/* 옆면 페이드 */}
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
        {/* 센터 가르마 */}
        <line x1="50" y1="18" x2="50" y2="33" stroke="#6b5543" strokeWidth="2" />
        {/* 양쪽 커튼 */}
        <path d="M39 28 Q33 34 33 40" stroke={c} strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M61 28 Q67 34 67 40" stroke={c} strokeWidth="5" fill="none" strokeLinecap="round" />
      </>
    case 'topknot':
      return <>
        <ellipse cx="50" cy="30" rx="20" ry="9" fill={c} />
        {/* 상단 상투 */}
        <ellipse cx="50" cy="18" rx="9" ry="7" fill={c} />
        {/* 묶음 띠 */}
        <rect x="45" y="24" width="10" height="4" rx="2" fill="#6b5543" />
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
      return <>
        <ellipse cx="50" cy="28" rx="21" ry="15" fill={c} />
        <ellipse cx="50" cy="13" rx="10" ry="8" fill={c} />
        <circle  cx="50" cy="13" r="5"          fill={c} opacity="0.6" />
      </>
    case 'straight':
      // 생머리 — 어깨 길이 직선 컷
      return <>
        <ellipse cx="50" cy="25" rx="22" ry="16" fill={c} />
        <rect x="28" y="33" width="9" height="30" rx="3" fill={c} />
        <rect x="63" y="33" width="9" height="30" rx="3" fill={c} />
        {/* 일자 컷 바닥선 */}
        <rect x="28" y="61" width="9" height="3" rx="1" fill={c} />
        <rect x="63" y="61" width="9" height="3" rx="1" fill={c} />
      </>
    case 'twin':
      // 양갈래 트윈테일
      return <>
        <ellipse cx="50" cy="26" rx="22" ry="16" fill={c} />
        {/* 왼쪽 꼬리 */}
        <path d="M30 26 Q19 38 21 58 Q23 68 26 76" stroke={c} strokeWidth="11" fill="none" strokeLinecap="round" />
        {/* 오른쪽 꼬리 */}
        <path d="M70 26 Q81 38 79 58 Q77 68 74 76" stroke={c} strokeWidth="11" fill="none" strokeLinecap="round" />
        {/* 리본/묶음 */}
        <circle cx="24" cy="31" r="4" fill="#ec4899" />
        <circle cx="76" cy="31" r="4" fill="#ec4899" />
      </>
    case 'half_up':
      // 반묶음
      return <>
        <ellipse cx="50" cy="25" rx="22" ry="16" fill={c} />
        {/* 아래 풀어진 머리 */}
        <rect x="28" y="35" width="9" height="36" rx="5" fill={c} />
        <rect x="63" y="35" width="9" height="36" rx="5" fill={c} />
        {/* 위쪽 묶음 */}
        <ellipse cx="50" cy="17" rx="13" ry="7" fill={c} />
        <ellipse cx="50" cy="15" rx="6" ry="5" fill={c} />
        {/* 헤어 핀 */}
        <circle cx="50" cy="14" r="3" fill="#f9a8d4" />
      </>
    case 'pixie':
      // 픽시컷
      return <>
        <ellipse cx="50" cy="29" rx="21" ry="11" fill={c} />
        <ellipse cx="32" cy="34" rx="6" ry="5"   fill={c} />
        <ellipse cx="68" cy="34" rx="6" ry="5"   fill={c} />
        <rect x="34" y="28" width="32" height="7" rx="3" fill={c} />
      </>
    case 'braid':
      // 땋은머리
      return <>
        <ellipse cx="50" cy="25" rx="22" ry="16" fill={c} />
        {/* 땋은 머리카락 줄기 */}
        <path d="M50 40 L50 85" stroke={c} strokeWidth="10" fill="none" strokeLinecap="round" />
        {/* 땋은 패턴 */}
        <path d="M46 42 Q54 48 46 54 Q54 60 46 66 Q54 72 46 78 Q54 82 50 85"
              stroke="#6b5543" strokeWidth="1.8" fill="none" />
        <path d="M54 42 Q46 48 54 54 Q46 60 54 66 Q46 72 54 78 Q46 82 50 85"
              stroke="#6b5543" strokeWidth="1.8" fill="none" />
        {/* 끝 묶음 */}
        <circle cx="50" cy="85" r="3" fill="#f9a8d4" />
      </>
    default:
      return <ellipse cx="50" cy="26" rx="22" ry="16" fill={c} />
  }
}

/* ── 앞머리 오버레이 (얼굴 위에 렌더) ── */
function BangsOverlay({ gender, c }: { gender: Gender; c: string }) {
  if (gender === 'female') {
    // 여성 앞머리 — 이마를 덮는 자연스러운 뱅
    return (
      <path
        d="M30 25 L70 25 Q70 37 50 36 Q30 37 30 25 Z"
        fill={c}
      />
    )
  }
  // 남성 앞머리 — 짧고 가로 직선 뱅
  return (
    <path
      d="M32 27 L68 27 Q68 36 50 35 Q32 36 32 27 Z"
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
  hairStyle: string   // "base" 또는 "base+bangs" 형식
  outfit: Outfit
  size?: number
  faceOnly?: boolean
}

export default function AvatarPreview({
  skinTone, gender, hairStyle, outfit, size = 120, faceOnly = false,
}: Props) {
  const skin = SKIN[skinTone] ?? SKIN.medium
  const viewBox = faceOnly ? '20 8 60 60' : '0 0 100 100'

  // "bob+bangs+blonde" → baseStyle="bob", hasBangs=true, hairColor="#c9a227"
  const parts     = hairStyle.split('+')
  const baseStyle = parts[0] ?? 'short'
  const hasBangs  = parts.includes('bangs')
  const colorSeg  = parts.find(s => s in HAIR_COLOR_MAP)
  const hc        = colorSeg ? HAIR_COLOR_MAP[colorSeg] : DEFAULT_HAIR_COLOR

  return (
    <svg width={size} height={size} viewBox={viewBox}
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
