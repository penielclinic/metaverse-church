'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import AvatarPreview from '@/components/world/AvatarPreview'
import { usePlazaPresence, type PresenceUser } from '@/lib/supabase/presence'
import type { SkinTone, Gender, Outfit } from '@/components/world/AvatarPreview'

// 광장 크기 (가상 좌표, %)
const FLOOR_W = 100
const FLOOR_H = 100

// 초기 위치
const INIT_X = 50
const INIT_Y = 50

interface PlazaCanvasProps {
  userId: string
  name: string
  skinTone: string
  gender: string
  hairStyle: string
  outfit: string
}

interface AvatarOnMap {
  userId: string
  name: string
  x: number
  y: number
  skinTone: string
  gender: string
  hairStyle: string
  outfit: string
  isMe?: boolean
}

export default function PlazaCanvas({ userId, name, skinTone, gender, hairStyle, outfit }: PlazaCanvasProps) {
  const floorRef = useRef<HTMLDivElement>(null)
  const [myPos, setMyPos] = useState({ x: INIT_X, y: INIT_Y })
  const [others, setOthers] = useState<PresenceUser[]>([])
  const [moving, setMoving] = useState(false)
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const me: PresenceUser = {
    userId, name, x: myPos.x, y: myPos.y,
    skinTone, gender, hairStyle, outfit,
  }

  const { trackPosition } = usePlazaPresence({
    spaceId: 'plaza',
    me,
    onSync: setOthers,
  })

  // 클릭 위치 → % 좌표 계산 후 이동
  const handleFloorClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = floorRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.min(FLOOR_W - 4, Math.max(4, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.min(FLOOR_H - 4, Math.max(4, ((e.clientY - rect.top) / rect.height) * 100))

    setMyPos({ x, y })
    setMoving(true)
    if (moveTimer.current) clearTimeout(moveTimer.current)
    moveTimer.current = setTimeout(() => setMoving(false), 600)
    await trackPosition(x, y)
  }, [trackPosition])

  useEffect(() => () => { if (moveTimer.current) clearTimeout(moveTimer.current) }, [])

  const allAvatars: AvatarOnMap[] = [
    { ...me, x: myPos.x, y: myPos.y, isMe: true },
    ...others.map((u) => ({ ...u, isMe: false })),
  ]

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl" style={{ paddingBottom: '62%', minHeight: 300 }}>

      {/* ── 하늘 배경 ── */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, #c9dff5 0%, #dceef8 55%, #e8c99a 56%, #d4a96a 100%)',
      }} />

      {/* ── 루브르 궁전 건물 실루엣 (상단) ── */}
      <svg className="absolute top-0 left-0 w-full" viewBox="0 0 800 180" preserveAspectRatio="xMidYMax meet" style={{ pointerEvents: 'none' }}>
        {/* 왼쪽 날개 */}
        <rect x="0" y="60" width="220" height="120" fill="#c8b89a" />
        <rect x="10" y="50" width="200" height="15" fill="#b8a485" />
        {/* 왼쪽 창문들 */}
        {[30,65,100,135,170].map(x => (
          <g key={x}>
            <rect x={x} y="75" width="16" height="22" rx="2" fill="#7a9bbb" opacity="0.8" />
            <rect x={x} y="108" width="16" height="22" rx="2" fill="#7a9bbb" opacity="0.8" />
          </g>
        ))}
        {/* 왼쪽 지붕 장식 */}
        {[20,55,90,125,160,195].map(x => (
          <polygon key={x} points={`${x},50 ${x+8},30 ${x+16},50`} fill="#b8a485" />
        ))}

        {/* 중앙 본관 */}
        <rect x="220" y="30" width="360" height="150" fill="#c8b89a" />
        <rect x="215" y="18" width="370" height="16" fill="#b8a485" />
        {/* 중앙 아치 게이트 */}
        <rect x="360" y="95" width="80" height="85" rx="3" fill="#5a7a96" opacity="0.7" />
        <ellipse cx="400" cy="95" rx="40" ry="18" fill="#5a7a96" opacity="0.7" />
        {/* 중앙 창문들 */}
        {[235,275,315,445,485,525].map(x => (
          <g key={x}>
            <rect x={x} y="48" width="18" height="26" rx="2" fill="#7a9bbb" opacity="0.8" />
            <rect x={x} y="85" width="18" height="26" rx="2" fill="#7a9bbb" opacity="0.8" />
          </g>
        ))}
        {/* 중앙 지붕 장식 */}
        {[225,262,299,336,373,410,447,484,521,558].map(x => (
          <polygon key={x} points={`${x},18 ${x+9},0 ${x+18},18`} fill="#b8a485" />
        ))}
        {/* 중앙 시계/원형 장식 */}
        <circle cx="400" cy="44" r="14" fill="#b8a485" stroke="#a08060" strokeWidth="2" />
        <circle cx="400" cy="44" r="10" fill="#c8b89a" />

        {/* 오른쪽 날개 */}
        <rect x="580" y="60" width="220" height="120" fill="#c8b89a" />
        <rect x="590" y="50" width="200" height="15" fill="#b8a485" />
        {/* 오른쪽 창문들 */}
        {[600,635,670,705,740].map(x => (
          <g key={x}>
            <rect x={x} y="75" width="16" height="22" rx="2" fill="#7a9bbb" opacity="0.8" />
            <rect x={x} y="108" width="16" height="22" rx="2" fill="#7a9bbb" opacity="0.8" />
          </g>
        ))}
        {/* 오른쪽 지붕 장식 */}
        {[589,624,659,694,729,764].map(x => (
          <polygon key={x} points={`${x},50 ${x+8},30 ${x+16},50`} fill="#b8a485" />
        ))}
      </svg>

      {/* ── 광장 바닥 (원근감 석판) ── */}
      <div
        ref={floorRef}
        onClick={handleFloorClick}
        className="absolute cursor-pointer select-none"
        style={{
          left: 0, right: 0, bottom: 0,
          top: '38%',
          background: '#d4c4a0',
          backgroundImage: `
            repeating-linear-gradient(0deg,   transparent, transparent 29px, rgba(180,160,120,0.4) 30px),
            repeating-linear-gradient(90deg,  transparent, transparent 29px, rgba(180,160,120,0.4) 30px)
          `,
        }}
      >
        {/* 바닥 원근 오버레이 */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, rgba(180,150,100,0.35) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        {/* ── 유리 피라미드 ── */}
        <div className="absolute" style={{ left: '50%', top: '-18%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
          <svg width="90" height="100" viewBox="0 0 90 100">
            {/* 피라미드 면 */}
            <polygon points="45,0 90,95 0,95" fill="rgba(160,210,240,0.55)" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" />
            {/* 내부 격자선 */}
            <line x1="45" y1="0" x2="22" y2="47" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
            <line x1="45" y1="0" x2="67" y2="47" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
            <line x1="11" y1="23" x2="78" y2="23" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
            <line x1="56" y1="47" x2="33" y2="47" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
            <line x1="0" y1="95" x2="90" y2="95" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
            {/* 햇빛 반사 */}
            <polygon points="45,0 55,22 45,18" fill="rgba(255,255,255,0.35)" />
          </svg>
          {/* 피라미드 그림자 */}
          <div style={{ width: 90, height: 8, background: 'rgba(0,0,0,0.12)', borderRadius: '50%', marginTop: -4 }} />
        </div>

        {/* ── 분수대 (피라미드 좌우) ── */}
        {[{ l: '25%' }, { l: '72%' }].map((pos, i) => (
          <div key={i} className="absolute" style={{ left: pos.l, top: '12%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
            <div style={{
              width: 38, height: 38,
              borderRadius: '50%',
              border: '3px solid rgba(180,160,120,0.7)',
              background: 'radial-gradient(circle, #b8d8ea 0%, #7ab0cc 100%)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>⛲</div>
          </div>
        ))}

        {/* ── 가로등 ── */}
        {[{ l: '12%' }, { l: '35%' }, { l: '65%' }, { l: '88%' }].map((pos, i) => (
          <div key={i} className="absolute flex flex-col items-center" style={{ left: pos.l, top: '-8%', pointerEvents: 'none' }}>
            <div style={{ width: 3, height: 32, background: '#8b7355', borderRadius: 2 }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffe066', boxShadow: '0 0 8px 3px rgba(255,220,50,0.5)', marginTop: -14, marginLeft: -4 }} />
          </div>
        ))}

        {/* ── 관광객 / 방문객 안내 ── */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap"
          style={{ pointerEvents: 'none', fontSize: 11, color: 'rgba(100,80,50,0.7)', fontWeight: 600, letterSpacing: 1 }}>
          Musée du Louvre · 바닥을 클릭하면 이동해요
        </div>

        {/* ── 아바타 렌더링 ── */}
        {allAvatars.map((av) => (
          <AvatarMarker key={av.userId} avatar={av} moving={av.isMe ? moving : false} />
        ))}
      </div>
    </div>
  )
}

function AvatarMarker({ avatar, moving }: { avatar: AvatarOnMap; moving: boolean }) {
  return (
    <div
      className="absolute flex flex-col items-center"
      style={{
        left: `${avatar.x}%`,
        top:  `${avatar.y}%`,
        transform: 'translate(-50%, -100%)',
        transition: 'left 0.5s cubic-bezier(0.25,0.46,0.45,0.94), top 0.5s cubic-bezier(0.25,0.46,0.45,0.94)',
        pointerEvents: 'none',
        zIndex: Math.round(avatar.y),
      }}
    >
      {/* 아바타 SVG */}
      <div
        className={[
          'rounded-full border-2 bg-white shadow-md overflow-hidden',
          avatar.isMe ? 'border-blue-500 ring-2 ring-blue-300' : 'border-white',
          moving ? 'animate-bounce' : '',
        ].join(' ')}
        style={{ width: 36, height: 36 }}
      >
        <AvatarPreview
          skinTone={avatar.skinTone as SkinTone}
          gender={avatar.gender as Gender}
          hairStyle={avatar.hairStyle}
          outfit={avatar.outfit as Outfit}
          size={36}
          faceOnly
        />
      </div>

      {/* 이름 말풍선 */}
      <div className={[
        'mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm whitespace-nowrap',
        avatar.isMe ? 'bg-blue-500 text-white' : 'bg-white/90 text-gray-700',
      ].join(' ')}>
        {avatar.isMe ? '나' : avatar.name}
      </div>

      {/* 그림자 */}
      <div className="w-6 h-1 rounded-full bg-black/10 mt-0.5" />
    </div>
  )
}
