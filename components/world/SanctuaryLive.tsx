'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type ReactionType = 'amen' | 'clap' | 'hallelujah'
type CaptionLang = 'off' | 'ko' | 'en'

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

const CAPTION_OPTIONS: { lang: CaptionLang; label: string }[] = [
  { lang: 'off', label: '자막 끄기' },
  { lang: 'ko', label: '한국어' },
  { lang: 'en', label: 'English' },
]

function buildEmbedUrl(videoId: string, captionLang: CaptionLang) {
  const base = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`
  if (captionLang === 'off') return base
  return `${base}&cc_load_policy=1&cc_lang_pref=${captionLang}`
}

export default function SanctuaryLive() {
  const supabase = createClient()
  const [counts, setCounts] = useState<Record<ReactionType, number>>({
    amen: 0, clap: 0, hallelujah: 0,
  })
  const [floaters, setFloaters] = useState<FloatingEmoji[]>([])
  const [liveVideoId, setLiveVideoId] = useState<string | null>(null)
  const [liveChecked, setLiveChecked] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [captionLang, setCaptionLang] = useState<CaptionLang>('off')
  const idRef = useRef(0)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const viewRecordedRef = useRef(false)

  // 로그인 유저 ID 캐시
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // 라이브 영상이 있을 때 시청 기록 (하루 1회 upsert)
  useEffect(() => {
    if (!liveVideoId || !userId || viewRecordedRef.current) return
    viewRecordedRef.current = true
    const today = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any).from('worship_views').upsert(
      { user_id: userId, worship_date: today, youtube_id: liveVideoId },
      { onConflict: 'user_id,worship_date' }
    ).then(() => {/* 기록 완료 */})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveVideoId, userId])

  // Realtime 브로드캐스트 수신
  useEffect(() => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // DB 저장 (로그인한 경우)
    if (userId) {
      const today = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(supabase as any).from('worship_reactions').insert({
        user_id: userId,
        reaction: type,
        worship_date: today,
        youtube_id: liveVideoId,
      }).then(() => {/* 저장 완료 */})
    }
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
              key={`${liveVideoId}-${captionLang}`}
              className="absolute inset-0 w-full h-full"
              src={buildEmbedUrl(liveVideoId, captionLang)}
              title="주일예배 라이브"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
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

        {/* ── 자막 언어 선택 ── */}
        {liveVideoId && (
          <div className="flex items-center gap-2 justify-center flex-wrap">
            <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">CC 자막</span>
            {CAPTION_OPTIONS.map(({ lang, label }) => (
              <button
                key={lang}
                onClick={() => setCaptionLang(lang)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                  captionLang === lang
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

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

        <p className="text-center text-xs text-gray-400" style={{ wordBreak: 'keep-all' }}>
          버튼을 눌러 예배에 함께 반응해요 · 다른 성도들과 실시간으로 공유됩니다
        </p>
      </div>
    </>
  )
}
