'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import DevotionForm from './DevotionForm'
import DevotionCard, { type DevotionCardData } from './DevotionCard'
import { useAvatarStore } from '@/store/avatarStore'

interface FeedResponse {
  feed: DevotionCardData[]
  myDevotionToday: boolean
  myStreak: number
}

export default function DevotionFeed() {
  const { addExp } = useAvatarStore()

  const [feed, setFeed] = useState<DevotionCardData[]>([])
  const [myDevotionToday, setMyDevotionToday] = useState(false)
  const [myStreak, setMyStreak] = useState(0)
  const [loadingFeed, setLoadingFeed] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [amenLoadingId, setAmenLoadingId] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  const loadFeed = useCallback(async () => {
    setLoadingFeed(true)
    try {
      const res = await fetch('/api/devotion/feed')
      if (!res.ok) throw new Error('feed error')
      const data: FeedResponse = await res.json()
      setFeed(data.feed)
      setMyDevotionToday(data.myDevotionToday)
      setMyStreak(data.myStreak)
    } catch {
      showToast('피드를 불러오지 못했습니다.')
    } finally {
      setLoadingFeed(false)
    }
  }, [])

  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  // 큐티 작성 제출
  const handleSubmit = async (bibleRef: string, content: string) => {
    setSubmitLoading(true)
    try {
      const res = await fetch('/api/devotion/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bibleRef, content }),
      })
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error ?? '저장에 실패했습니다.')
        return
      }

      addExp(data.expEarned)
      setMyDevotionToday(true)
      setMyStreak(data.streak)

      const bonusMsg = data.bonusExp > 0 ? ` (보너스 +${data.bonusExp})` : ''
      const levelMsg = data.levelUp ? ' · 레벨 업! 🎉' : ''
      const streakMsg =
        data.streak > 1 ? ` · ${data.streak}일 연속 🔥` : ''
      showToast(`+${data.expEarned} EXP${bonusMsg}${streakMsg}${levelMsg}`)

      await loadFeed()
    } catch {
      showToast('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitLoading(false)
    }
  }

  // 아멘 토글
  const handleAmen = async (devotionId: number) => {
    setAmenLoadingId(devotionId)
    try {
      const res = await fetch('/api/devotion/amen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devotionId }),
      })
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error ?? '아멘 처리에 실패했습니다.')
        return
      }

      // 낙관적 UI 업데이트
      setFeed((prev) =>
        prev.map((d) => {
          if (d.id !== devotionId) return d
          const delta = data.amened ? 1 : -1
          return {
            ...d,
            isAmenedByMe: data.amened,
            amenCount: d.amenCount + delta,
          }
        })
      )
    } catch {
      showToast('네트워크 오류가 발생했습니다.')
    } finally {
      setAmenLoadingId(null)
    }
  }

  const todayStr = new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  return (
    <div className="space-y-5">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-800">📖 큐티 인증 피드</h2>
          <p className="text-xs text-gray-400 mt-0.5">{todayStr} · 셀원들의 오늘 묵상</p>
        </div>
        <button
          onClick={loadFeed}
          disabled={loadingFeed}
          className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold transition disabled:opacity-40"
        >
          {loadingFeed ? '로딩...' : '새로고침'}
        </button>
      </div>

      {/* 작성 폼 또는 완료 배너 */}
      {myDevotionToday ? (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 text-center">
          <p className="text-2xl mb-1">✅</p>
          <p className="font-bold text-green-700 text-sm" style={{ wordBreak: 'keep-all' }}>
            오늘 큐티 인증 완료!
          </p>
          {myStreak > 1 && (
            <p className="text-xs text-orange-500 font-semibold mt-1">
              🔥 {myStreak}일 연속 인증 중
            </p>
          )}
          <p className="text-xs text-green-500 mt-0.5" style={{ wordBreak: 'keep-all' }}>
            셀원들의 묵상에 아멘으로 응답해보세요
          </p>
        </div>
      ) : (
        <DevotionForm
          streak={myStreak}
          onSubmit={handleSubmit}
          loading={submitLoading}
        />
      )}

      {/* 피드 목록 */}
      <div className="space-y-3">
        {loadingFeed ? (
          // 스켈레톤
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 animate-pulse space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-gray-200" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-gray-200 rounded w-20" />
                  <div className="h-2.5 bg-gray-100 rounded w-12" />
                </div>
                <div className="h-6 bg-gray-100 rounded-full w-24" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-5/6" />
                <div className="h-3 bg-gray-100 rounded w-4/6" />
              </div>
            </div>
          ))
        ) : feed.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm font-medium" style={{ wordBreak: 'keep-all' }}>
              오늘 아직 큐티를 작성한 셀원이 없어요
            </p>
            <p className="text-xs mt-1" style={{ wordBreak: 'keep-all' }}>
              첫 번째로 오늘의 말씀을 나눠보세요!
            </p>
          </div>
        ) : (
          feed.map((item) => (
            <DevotionCard
              key={item.id}
              {...item}
              onAmen={handleAmen}
              amenLoadingId={amenLoadingId}
            />
          ))
        )}
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm font-semibold px-5 py-3 rounded-full shadow-xl whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
