'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import AvatarPreview from '@/components/world/AvatarPreview'
import { usePlazaPresence, type PresenceUser } from '@/lib/supabase/presence'
import type { SkinTone, Gender, Outfit } from '@/components/world/AvatarPreview'

const FLOOR_W = 100
const FLOOR_H = 100
const INIT_X  = 50
const INIT_Y  = 50

// ── 벤치 정의 ────────────────────────────────────────────────
// x, y: 바닥 영역 기준 %, seats: 좌석 3개
// seatOffsets: 각 좌석의 (dx, dy) %
interface BenchDef {
  id: string
  x: number   // 벤치 중심 x%
  y: number   // 벤치 중심 y%
  horizontal: boolean
  seatOffsets: { dx: number; dy: number }[]
}

const BENCHES: BenchDef[] = [
  {
    id: 'bench-tl', x: 17, y: 30, horizontal: true,
    seatOffsets: [{ dx: -7, dy: 0 }, { dx: 0, dy: 0 }, { dx: 7, dy: 0 }],
  },
  {
    id: 'bench-tr', x: 80, y: 30, horizontal: true,
    seatOffsets: [{ dx: -7, dy: 0 }, { dx: 0, dy: 0 }, { dx: 7, dy: 0 }],
  },
  {
    id: 'bench-bl', x: 22, y: 75, horizontal: true,
    seatOffsets: [{ dx: -7, dy: 0 }, { dx: 0, dy: 0 }, { dx: 7, dy: 0 }],
  },
  {
    id: 'bench-br', x: 76, y: 75, horizontal: true,
    seatOffsets: [{ dx: -7, dy: 0 }, { dx: 0, dy: 0 }, { dx: 7, dy: 0 }],
  },
]

interface PlazaCanvasProps {
  userId: string
  name: string
  skinTone: string
  gender: string
  hairStyle: string
  outfit: string
}

interface AvatarOnMap extends PresenceUser {
  isMe: boolean
  moving: boolean
}

export default function PlazaCanvas({ userId, name, skinTone, gender, hairStyle, outfit }: PlazaCanvasProps) {
  const floorRef  = useRef<HTMLDivElement>(null)
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [myPos,    setMyPos]    = useState({ x: INIT_X, y: INIT_Y })
  const [myBench,  setMyBench]  = useState<{ benchId: string; seatIndex: number } | null>(null)
  const [others,   setOthers]   = useState<PresenceUser[]>([])
  const [moving,   setMoving]   = useState(false)
  const [toast,    setToast]    = useState('')

  const me: PresenceUser = {
    userId, name, x: myPos.x, y: myPos.y,
    skinTone, gender, hairStyle, outfit,
    benchId: myBench?.benchId ?? null,
    seatIndex: myBench?.seatIndex ?? null,
  }

  const { trackPosition } = usePlazaPresence({ spaceId: 'plaza', me, onSync: setOthers })

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  // 벤치 좌석 → 절대 좌표 (%  in floor)
  const seatPos = (bench: BenchDef, si: number) => ({
    x: bench.x + bench.seatOffsets[si].dx,
    y: bench.y + bench.seatOffsets[si].dy,
  })

  // 점유된 좌석 맵: benchId → Set<seatIndex>
  const occupiedMap = new Map<string, Set<number>>()
  for (const u of others) {
    if (u.benchId && u.seatIndex !== null) {
      if (!occupiedMap.has(u.benchId)) occupiedMap.set(u.benchId, new Set())
      occupiedMap.get(u.benchId)!.add(u.seatIndex)
    }
  }
  if (myBench) {
    if (!occupiedMap.has(myBench.benchId)) occupiedMap.set(myBench.benchId, new Set())
    occupiedMap.get(myBench.benchId)!.add(myBench.seatIndex)
  }

  // 바닥 클릭 → 이동 (앉아 있으면 일어남)
  const handleFloorClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = floorRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.min(FLOOR_W - 4, Math.max(4, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.min(FLOOR_H - 4, Math.max(4, ((e.clientY - rect.top) / rect.height) * 100))

    setMyPos({ x, y })
    setMyBench(null)
    setMoving(true)
    if (moveTimer.current) clearTimeout(moveTimer.current)
    moveTimer.current = setTimeout(() => setMoving(false), 600)
    await trackPosition(x, y, null, null)
  }, [trackPosition])

  // 벤치 클릭 → 앉기/일어서기
  const handleBenchClick = useCallback(async (bench: BenchDef, e: React.MouseEvent) => {
    e.stopPropagation()

    // 이미 이 벤치에 앉아 있으면 일어서기
    if (myBench?.benchId === bench.id) {
      setMyBench(null)
      setMoving(true)
      if (moveTimer.current) clearTimeout(moveTimer.current)
      moveTimer.current = setTimeout(() => setMoving(false), 600)
      await trackPosition(myPos.x, myPos.y, null, null)
      return
    }

    // 빈 좌석 찾기
    const occupied = occupiedMap.get(bench.id) ?? new Set<number>()
    const freeSeat = bench.seatOffsets.findIndex((_, i) => !occupied.has(i))
    if (freeSeat === -1) {
      showToast('벤치가 꽉 찼어요 🪑')
      return
    }

    const pos = seatPos(bench, freeSeat)
    setMyPos(pos)
    setMyBench({ benchId: bench.id, seatIndex: freeSeat })
    setMoving(false)
    await trackPosition(pos.x, pos.y, bench.id, freeSeat)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myBench, myPos, trackPosition, occupiedMap])

  useEffect(() => () => { if (moveTimer.current) clearTimeout(moveTimer.current) }, [])

  const allAvatars: AvatarOnMap[] = [
    { ...me, isMe: true, moving },
    ...others.map((u) => ({ ...u, isMe: false, moving: false })),
  ]

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl" style={{ paddingBottom: '62%', minHeight: 300 }}>

      {/* ── 하늘 배경 ── */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, #c9dff5 0%, #dceef8 55%, #e8c99a 56%, #d4a96a 100%)',
      }} />

      {/* ── 루브르 궁전 건물 실루엣 ── */}
      <svg className="absolute top-0 left-0 w-full" viewBox="0 0 800 180" preserveAspectRatio="xMidYMax meet" style={{ pointerEvents: 'none' }}>
        <rect x="0" y="60" width="220" height="120" fill="#c8b89a" />
        <rect x="10" y="50" width="200" height="15" fill="#b8a485" />
        {[30,65,100,135,170].map(x => (
          <g key={x}>
            <rect x={x} y="75" width="16" height="22" rx="2" fill="#7a9bbb" opacity="0.8" />
            <rect x={x} y="108" width="16" height="22" rx="2" fill="#7a9bbb" opacity="0.8" />
          </g>
        ))}
        {[20,55,90,125,160,195].map(x => (
          <polygon key={x} points={`${x},50 ${x+8},30 ${x+16},50`} fill="#b8a485" />
        ))}
        <rect x="220" y="30" width="360" height="150" fill="#c8b89a" />
        <rect x="215" y="18" width="370" height="16" fill="#b8a485" />
        <rect x="360" y="95" width="80" height="85" rx="3" fill="#5a7a96" opacity="0.7" />
        <ellipse cx="400" cy="95" rx="40" ry="18" fill="#5a7a96" opacity="0.7" />
        {[235,275,315,445,485,525].map(x => (
          <g key={x}>
            <rect x={x} y="48" width="18" height="26" rx="2" fill="#7a9bbb" opacity="0.8" />
            <rect x={x} y="85" width="18" height="26" rx="2" fill="#7a9bbb" opacity="0.8" />
          </g>
        ))}
        {[225,262,299,336,373,410,447,484,521,558].map(x => (
          <polygon key={x} points={`${x},18 ${x+9},0 ${x+18},18`} fill="#b8a485" />
        ))}
        <circle cx="400" cy="44" r="14" fill="#b8a485" stroke="#a08060" strokeWidth="2" />
        <circle cx="400" cy="44" r="10" fill="#c8b89a" />

        {/* ── 십자가 (중앙 본관 지붕 위, 잘 보이도록 내림) ── */}
        <circle cx="400" cy="14" r="18" fill="rgba(255,230,130,0.18)" />
        <rect x="396" y="-2"  width="9" height="34" rx="2" fill="#f5e8c8" stroke="#c8902a" strokeWidth="1.5" />
        <rect x="384" y="10"  width="33" height="9" rx="2" fill="#f5e8c8" stroke="#c8902a" strokeWidth="1.5" />

        {/* ── 교회 이름 현판 ── */}
        <rect x="310" y="155" width="180" height="22" rx="4" fill="#a08050" opacity="0.85" />
        <text x="400" y="170" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#fff8e8" fontFamily="serif" letterSpacing="1">해운대순복음교회</text>

        <rect x="580" y="60" width="220" height="120" fill="#c8b89a" />
        <rect x="590" y="50" width="200" height="15" fill="#b8a485" />
        {[600,635,670,705,740].map(x => (
          <g key={x}>
            <rect x={x} y="75" width="16" height="22" rx="2" fill="#7a9bbb" opacity="0.8" />
            <rect x={x} y="108" width="16" height="22" rx="2" fill="#7a9bbb" opacity="0.8" />
          </g>
        ))}
        {[589,624,659,694,729,764].map(x => (
          <polygon key={x} points={`${x},50 ${x+8},30 ${x+16},50`} fill="#b8a485" />
        ))}
      </svg>

      {/* ── 광장 바닥 ── */}
      <div
        ref={floorRef}
        onClick={handleFloorClick}
        className="absolute cursor-pointer select-none"
        style={{
          left: 0, right: 0, bottom: 0, top: '38%',
          background: '#d4c4a0',
          backgroundImage: `
            repeating-linear-gradient(0deg,  transparent, transparent 29px, rgba(180,160,120,0.4) 30px),
            repeating-linear-gradient(90deg, transparent, transparent 29px, rgba(180,160,120,0.4) 30px)
          `,
        }}
      >
        {/* 원근 오버레이 */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, rgba(180,150,100,0.35) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        {/* ── 유리 피라미드 ── */}
        <div className="absolute" style={{ left: '50%', top: '-18%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
          <svg width="90" height="100" viewBox="0 0 90 100">
            <polygon points="45,0 90,95 0,95" fill="rgba(160,210,240,0.55)" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" />
            <line x1="45" y1="0" x2="22" y2="47" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
            <line x1="45" y1="0" x2="67" y2="47" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
            <line x1="11" y1="23" x2="78" y2="23" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
            <line x1="56" y1="47" x2="33" y2="47" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
            <polygon points="45,0 55,22 45,18" fill="rgba(255,255,255,0.35)" />
          </svg>
          <div style={{ width: 90, height: 8, background: 'rgba(0,0,0,0.12)', borderRadius: '50%', marginTop: -4 }} />
        </div>

        {/* ── 분수대 ── */}
        {[{ l: '25%' }, { l: '72%' }].map((pos, i) => (
          <div key={i} className="absolute" style={{ left: pos.l, top: '12%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              border: '3px solid rgba(180,160,120,0.7)',
              background: 'radial-gradient(circle, #b8d8ea 0%, #7ab0cc 100%)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
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

        {/* ── 벤치들 ── */}
        {BENCHES.map((bench) => {
          const occupied  = occupiedMap.get(bench.id) ?? new Set<number>()
          const isMySeat  = myBench?.benchId === bench.id
          const isFull    = occupied.size >= bench.seatOffsets.length

          return (
            <BenchObject
              key={bench.id}
              bench={bench}
              occupied={occupied}
              isMySeat={isMySeat}
              isFull={isFull}
              onClick={(e) => handleBenchClick(bench, e)}
            />
          )
        })}

        {/* ── 아바타 렌더링 ── */}
        {allAvatars.map((av) => (
          <AvatarMarker key={av.userId} avatar={av} />
        ))}

        {/* ── 안내 텍스트 ── */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap"
          style={{ pointerEvents: 'none', fontSize: 11, color: 'rgba(100,80,50,0.7)', fontWeight: 600, letterSpacing: 1 }}>
          해운대순복음교회 · 바닥 클릭: 이동 · 벤치 클릭: 앉기
        </div>
      </div>

      {/* ── 토스트 ── */}
      {toast && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs font-bold px-4 py-2 rounded-full pointer-events-none z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}

// ── 벤치 오브젝트 컴포넌트 ─────────────────────────────────────
function BenchObject({
  bench, occupied, isMySeat, isFull, onClick,
}: {
  bench: BenchDef
  occupied: Set<number>
  isMySeat: boolean
  isFull: boolean
  onClick: (e: React.MouseEvent) => void
}) {
  const seatCount = bench.seatOffsets.length
  const freeCount = seatCount - occupied.size

  return (
    <div
      className="absolute"
      style={{ left: `${bench.x}%`, top: `${bench.y}%`, transform: 'translate(-50%, -50%)', zIndex: Math.round(bench.y) - 1 }}
    >
      {/* 클릭 영역 */}
      <button
        onClick={onClick}
        title={isFull ? '벤치가 꽉 찼어요' : isMySeat ? '일어서기' : `앉기 (${freeCount}자리 남음)`}
        className="relative flex flex-col items-center group focus:outline-none"
        style={{ cursor: isFull && !isMySeat ? 'not-allowed' : 'pointer' }}
      >
        {/* 벤치 SVG */}
        <svg
          width="72" height="28" viewBox="0 0 72 28"
          className={[
            'drop-shadow-md transition-transform duration-150',
            !isFull || isMySeat ? 'group-hover:scale-110' : '',
          ].join(' ')}
        >
          {/* 등받이 */}
          <rect x="4" y="0" width="64" height="8" rx="3"
            fill={isMySeat ? '#7c6f4a' : '#9e8c6a'} stroke="#7a6040" strokeWidth="1" />
          {/* 좌석판 */}
          <rect x="2" y="10" width="68" height="9" rx="3"
            fill={isMySeat ? '#b8a070' : '#c8ae80'} stroke="#9a7a50" strokeWidth="1" />
          {/* 좌석 슬롯 라인 */}
          <line x1="25" y1="10" x2="25" y2="19" stroke="#9a7a50" strokeWidth="0.8" />
          <line x1="47" y1="10" x2="47" y2="19" stroke="#9a7a50" strokeWidth="0.8" />
          {/* 다리 */}
          <rect x="8"  y="19" width="5" height="9" rx="1" fill="#7a6040" />
          <rect x="59" y="19" width="5" height="9" rx="1" fill="#7a6040" />
          {/* 좌석 점유 표시 */}
          {bench.seatOffsets.map((_, i) => {
            const cx = 13 + i * 23
            return occupied.has(i)
              ? <circle key={i} cx={cx} cy="14" r="5" fill="rgba(80,60,30,0.35)" />
              : <circle key={i} cx={cx} cy="14" r="4" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
          })}
        </svg>

        {/* 좌석 상태 뱃지 */}
        <div className={[
          'mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap shadow-sm',
          isMySeat
            ? 'bg-amber-500 text-white'
            : isFull
              ? 'bg-gray-400/80 text-white'
              : 'bg-white/80 text-amber-800 opacity-0 group-hover:opacity-100 transition-opacity',
        ].join(' ')}>
          {isMySeat ? '🪑 앉는 중 (클릭 시 일어서기)' : isFull ? '만석' : `🪑 ${freeCount}자리`}
        </div>
      </button>
    </div>
  )
}

// ── 아바타 마커 컴포넌트 ──────────────────────────────────────
function AvatarMarker({ avatar }: { avatar: AvatarOnMap }) {
  const isSeated = avatar.benchId !== null

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{
        left: `${avatar.x}%`,
        top:  `${avatar.y}%`,
        transform: isSeated ? 'translate(-50%, -80%)' : 'translate(-50%, -100%)',
        transition: 'left 0.5s cubic-bezier(0.25,0.46,0.45,0.94), top 0.5s cubic-bezier(0.25,0.46,0.45,0.94)',
        pointerEvents: 'none',
        zIndex: Math.round(avatar.y) + 10,
      }}
    >
      {/* 아바타 얼굴 */}
      <div
        className={[
          'rounded-full border-2 bg-white shadow-md overflow-hidden',
          avatar.isMe ? 'border-blue-500 ring-2 ring-blue-300' : 'border-white',
          avatar.moving ? 'animate-bounce' : '',
          isSeated ? 'opacity-90' : '',
        ].join(' ')}
        style={{ width: 34, height: 34 }}
      >
        <AvatarPreview
          skinTone={avatar.skinTone as SkinTone}
          gender={avatar.gender as Gender}
          hairStyle={avatar.hairStyle}
          outfit={avatar.outfit as Outfit}
          size={34}
          faceOnly
        />
      </div>

      {/* 이름 뱃지 */}
      <div className={[
        'mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm whitespace-nowrap',
        avatar.isMe ? 'bg-blue-500 text-white' : 'bg-white/90 text-gray-700',
      ].join(' ')}>
        {isSeated && '🪑 '}{avatar.isMe ? '나' : avatar.name}
      </div>

      {/* 그림자 */}
      <div className={['rounded-full bg-black/10 mt-0.5', isSeated ? 'w-8 h-1.5' : 'w-6 h-1'].join(' ')} />
    </div>
  )
}
