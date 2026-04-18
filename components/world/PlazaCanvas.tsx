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
    <div className="relative w-full" style={{ paddingBottom: '60%', minHeight: 280 }}>
      {/* 광장 배경 */}
      <div
        ref={floorRef}
        onClick={handleFloorClick}
        className="absolute inset-0 rounded-2xl overflow-hidden cursor-pointer select-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 60%, #e0f2fe 0%, #bae6fd 40%, #7dd3fc 100%)',
          backgroundImage: `
            radial-gradient(ellipse at 50% 60%, #e0f2fe 0%, #bae6fd 40%, #7dd3fc 100%),
            repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.25) 40px),
            repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.25) 40px)
          `,
        }}
      >
        {/* 광장 중앙 분수대 */}
        <div className="absolute"
          style={{ left: '50%', top: '45%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-blue-300 bg-blue-100/70 flex items-center justify-center shadow-inner">
            <span className="text-2xl sm:text-3xl">⛲</span>
          </div>
        </div>

        {/* 나무 장식 */}
        {[
          { l: '10%', t: '15%' }, { l: '85%', t: '12%' },
          { l: '8%',  t: '75%' }, { l: '88%', t: '72%' },
        ].map((pos, i) => (
          <div key={i} className="absolute text-xl sm:text-2xl" style={{ left: pos.l, top: pos.t, pointerEvents: 'none' }}>🌳</div>
        ))}

        {/* 안내 텍스트 */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-blue-700/60 font-medium whitespace-nowrap" style={{ pointerEvents: 'none' }}>
          바닥을 클릭하면 이동해요
        </div>

        {/* 아바타 렌더링 */}
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
