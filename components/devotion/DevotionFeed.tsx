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

type Tab = 'certify' | 'share'

export default function DevotionFeed() {
  const { addExp } = useAvatarStore()

  const [tab, setTab] = useState<Tab>('certify')
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

  // 오늘 인증한 성도 수
  const today = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10)
  const todayCount = feed.filter(d => d.loggedDate === today).length

  return (
    <div className="space-y-4">
      {/* 탭 */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setTab('certify')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
            tab === 'certify' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'
          }`}
        >
          ✅ 큐티 인증
        </button>
        <button
          onClick={() => setTab('share')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
            tab === 'share' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'
          }`}
        >
          📖 묵상 나눔
        </button>
      </div>

      {/* ── 탭 1: 큐티 인증 ── */}
      {tab === 'certify' && (
        <div className="space-y-4">
          {/* 인증 상태 */}
          {myDevotionToday ? (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 text-center">
              <p className="text-3xl mb-2">✅</p>
              <p className="font-bold text-green-700 text-base" style={{ wordBreak: 'keep-all' }}>
                오늘 큐티 인증 완료!
              </p>
              {myStreak > 1 && (
                <p className="text-sm text-orange-500 font-bold mt-1">
                  🔥 {myStreak}일 연속 인증 중
                </p>
              )}
              <p className="text-xs text-green-500 mt-2" style={{ wordBreak: 'keep-all' }}>
                묵상 나눔 탭에서 성도들의 묵상에 댓글을 남겨보세요
              </p>
            </div>
          ) : (
            <DevotionForm
              streak={myStreak}
              onSubmit={handleSubmit}
              loading={submitLoading}
            />
          )}

          {/* 오늘 인증 현황 */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-700">📊 오늘 인증 현황</p>
              <p className="text-xs text-gray-400">{todayStr}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center flex-1">
                <p className="text-2xl font-black text-indigo-600">{todayCount}</p>
                <p className="text-[11px] text-gray-400">오늘 인증</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-2xl font-black text-orange-500">{myStreak}</p>
                <p className="text-[11px] text-gray-400">내 연속일</p>
              </div>
            </div>
            {/* 오늘 인증한 성도 이름 */}
            {todayCount > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-[11px] text-gray-400 mb-1.5">오늘 인증한 성도</p>
                <div className="flex flex-wrap gap-1.5">
                  {feed.filter(d => d.loggedDate === today).map(d => (
                    <span key={d.id} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                      {d.authorName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 탭 2: 묵상 나눔 ── */}
      {tab === 'share' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">{todayStr} · 성도들의 묵상을 함께 나눠요</p>
            <button
              onClick={loadFeed}
              disabled={loadingFeed}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold transition disabled:opacity-40"
            >
              {loadingFeed ? '로딩...' : '새로고침'}
            </button>
          </div>

          {/* 피드 목록 */}
          <div className="space-y-3">
            {loadingFeed ? (
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
                  </div>
                </div>
              ))
            ) : feed.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-sm font-medium" style={{ wordBreak: 'keep-all' }}>
                  아직 묵상 나눔이 없어요
                </p>
                <p className="text-xs mt-1" style={{ wordBreak: 'keep-all' }}>
                  큐티 인증 탭에서 먼저 인증해보세요!
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
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm font-semibold px-5 py-3 rounded-full shadow-xl whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
