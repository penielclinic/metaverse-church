'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type ReactionType = 'amen' | 'clap' | 'hallelujah'

interface FloatingEmoji {
  id: number
  emoji: string
  x: number
}

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'amen', emoji: '🙏', label: '아멘' },
  { type: 'clap', emoji: '👏', label: '박수' },
  { type: 'hallelujah', emoji: '✝️', label: '할렐루야' },
]

export default function SanctuaryLive() {
  const [counts, setCounts] = useState<Record<ReactionType, number>>({
    amen: 0,
    clap: 0,
    hallelujah: 0,
  })
  const [floaters, setFloaters] = useState<FloatingEmoji[]>([])
  const [liveVideoId, setLiveVideoId] = useState<string | null>(null)
  const [liveChecked, setLiveChecked] = useState(false)
  const idRef = useRef(0)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  const addFloater = useCallback((emoji: string, x: number) => {
    const id = idRef.current++
    setFloaters((prev) => [...prev, { id, emoji, x }])
    setTimeout(() => {
      setFloaters((prev) => prev.filter((f) => f.id !== id))
    }, 2500)
  }, [])

  // 현재 라이브 비디오 ID 조회 (60초 캐시)
  useEffect(() => {
    fetch('/api/youtube/live')
      .then((r) => r.json())
      .then(({ videoId }) => {
        setLiveVideoId(videoId ?? null)
        setLiveChecked(true)
      })
      .catch(() => setLiveChecked(true))
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel('worship_reactions')
    channelRef.current = ch

    ch.on('broadcast', { event: 'reaction' }, ({ payload }) => {
      const type = payload.type as ReactionType
      const emoji = REACTIONS.find((r) => r.type === type)?.emoji ?? '🙏'
      setCounts((prev) => ({ ...prev, [type]: prev[type] + 1 }))
      addFloater(emoji, payload.x ?? 50)
    }).subscribe()

    return () => {
      supabase.removeChannel(ch)
      channelRef.current = null
    }
  }, [addFloater])

  const handleReaction = (type: ReactionType) => {
    const reaction = REACTIONS.find((r) => r.type === type)!
    const x = 15 + Math.random() * 70

    // 로컬 즉시 반영
    setCounts((prev) => ({ ...prev, [type]: prev[type] + 1 }))
    addFloater(reaction.emoji, x)

    // 다른 접속자에게 브로드캐스트
    channelRef.current?.send({
      type: 'broadcast',
      event: 'reaction',
      payload: { type, x },
    })
  }

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1);   opacity: 1; }
          80%  { opacity: 0.8; }
          100% { transform: translateY(-180px) scale(1.6); opacity: 0; }
        }
        .sanctuary-float { animation: floatUp 2.5s ease-out forwards; }
      `}</style>

      <div className="space-y-4">
        {/* ── YouTube 라이브 임베드 ── */}
        <div
          className="relative w-full overflow-hidden rounded-2xl shadow-lg bg-black"
          style={{ paddingTop: '56.25%' }}
        >
          {liveVideoId ? (
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${liveVideoId}?autoplay=1&mute=1`}
              title="주일예배 라이브"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            /* 라이브 없을 때 placeholder */
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 px-4 text-center">
              <span className="text-6xl">⛪</span>
              {!liveChecked ? (
                <p className="text-sm text-gray-400">라이브 확인 중...</p>
              ) : (
                <>
                  <p className="text-lg font-bold">예배 준비 중</p>
                  <p className="text-sm text-gray-400" style={{ wordBreak: 'keep-all' }}>
                    주일예배 라이브가 시작되면 이곳에 자동으로 송출됩니다
                  </p>
                </>
              )}
            </div>
          )}

          {/* 떠오르는 반응 이모지 */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {floaters.map((f) => (
              <span
                key={f.id}
                className="absolute bottom-4 text-3xl sanctuary-float select-none"
                style={{ left: `${f.x}%` }}
              >
                {f.emoji}
              </span>
            ))}
          </div>
        </div>

        {/* ── 반응 버튼 ── */}
        <div className="flex gap-3 justify-center">
          {REACTIONS.map(({ type, emoji, label }) => (
            <button
              key={type}
              onClick={() => handleReaction(type)}
              className="flex flex-col items-center gap-1 px-5 py-3 rounded-2xl bg-white shadow-md border border-gray-100 active:scale-90 transition-transform min-h-[72px] min-w-[84px] select-none"
            >
              <span className="text-3xl leading-none">{emoji}</span>
              <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">{label}</span>
              {counts[type] > 0 && (
                <span className="text-xs font-bold text-indigo-500">{counts[type]}</span>
              )}
            </button>
          ))}
        </div>

        {/* 반응 안내 */}
        <p className="text-center text-xs text-gray-400" style={{ wordBreak: 'keep-all' }}>
          버튼을 눌러 예배에 함께 반응해요 · 다른 성도들과 실시간으로 공유됩니다
        </p>
      </div>
    </>
  )
}
