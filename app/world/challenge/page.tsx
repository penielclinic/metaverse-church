'use client'

import { useState } from 'react'
import ChallengeCard, { type ChallengeCardProps } from '@/components/challenge/ChallengeCard'
import BadgeDisplay, { type Badge } from '@/components/challenge/BadgeDisplay'
import StreakCounter from '@/components/challenge/StreakCounter'
import Leaderboard, { type LeaderboardEntry } from '@/components/challenge/Leaderboard'
import { useAvatarStore } from '@/store/avatarStore'

// ─── 샘플 데이터 (Supabase 연동 전) ───────────────────────────────────────────

type ChallengeData = Omit<ChallengeCardProps, 'onComplete'> & { progress: number }

const INITIAL_CHALLENGES: ChallengeData[] = [
  {
    id: 1,
    title: '주간 말씀 묵상',
    description: '이번 주 QT를 5번 완료하세요. 매일 말씀을 묵상하며 하나님과 동행해요.',
    type: 'bible',
    progress: 3,
    targetCount: 5,
    expReward: 50,
    badgeReward: '📖 말씀수호자',
    completed: false,
  },
  {
    id: 2,
    title: '새벽기도 참여',
    description: '이번 주 새벽기도에 3번 참석하세요. 새벽 5시 기도실에서 함께해요.',
    type: 'prayer',
    progress: 2,
    targetCount: 3,
    expReward: 30,
    badgeReward: null,
    completed: false,
  },
  {
    id: 3,
    title: '주일예배 본당 입장',
    description: '이번 주일 메타버스 본당에서 예배드리세요.',
    type: 'worship',
    progress: 1,
    targetCount: 1,
    expReward: 40,
    badgeReward: null,
    completed: true,
  },
  {
    id: 4,
    title: '셀 모임 참석',
    description: '이번 주 순 모임방에 입장해 순장님, 순원들과 교제하세요.',
    type: 'service',
    progress: 0,
    targetCount: 1,
    expReward: 35,
    badgeReward: null,
    completed: false,
  },
]

const INITIAL_BADGES: Badge[] = [
  { slug: 'bible_rookie',    label: '말씀새싹',   emoji: '🌱', description: '성경 챌린지 처음 완료',    earned: true,  earnedAt: '2026-03-10' },
  { slug: 'bible_guard',     label: '말씀수호자', emoji: '📖', description: '성경 챌린지 5회 완료',     earned: false, earnedAt: null },
  { slug: 'prayer_warrior',  label: '기도용사',   emoji: '🙏', description: '기도 챌린지 7회 완료',     earned: false, earnedAt: null },
  { slug: 'worshiper',       label: '예배자',     emoji: '⛪', description: '예배 챌린지 4회 완료',     earned: false, earnedAt: null },
  { slug: 'servant',         label: '섬김이',     emoji: '🤝', description: '봉사 챌린지 3회 완료',     earned: false, earnedAt: null },
  { slug: 'streak_7',        label: '불꽃기도',   emoji: '🔥', description: '7일 연속 출석',             earned: false, earnedAt: null },
  { slug: 'cell_champ',      label: '순챔피언',   emoji: '🏆', description: '주간 순 랭킹 1위 달성',    earned: false, earnedAt: null },
  { slug: 'devoted',         label: '충성된자',   emoji: '💎', description: '한 달 개근',                earned: false, earnedAt: null },
]

const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, cellName: '1순', exp: 850, memberCount: 8, isMyCell: false },
  { rank: 2, cellName: '2순', exp: 720, memberCount: 7, isMyCell: false },
  { rank: 3, cellName: '3순', exp: 680, memberCount: 9, isMyCell: true  },
  { rank: 4, cellName: '4순', exp: 510, memberCount: 6, isMyCell: false },
  { rank: 5, cellName: '5순', exp: 430, memberCount: 8, isMyCell: false },
]

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function ChallengePage() {
  const { addExp } = useAvatarStore()
  const [challenges, setChallenges] = useState<ChallengeData[]>(INITIAL_CHALLENGES)
  const [badges, setBadges] = useState<Badge[]>(INITIAL_BADGES)
  const [streakDays, setStreakDays] = useState(3)
  const [checkedInToday, setCheckedInToday] = useState(true)
  const [checkInLoading, setCheckInLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // 챌린지 완료 처리
  const handleComplete = async (challengeId: number) => {
    const res = await fetch('/api/challenge/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId }),
    })

    if (!res.ok) {
      showToast('완료 처리에 실패했습니다. 다시 시도해주세요.')
      return
    }

    const data: {
      success: boolean
      expEarned: number
      levelUp: boolean
      newBadges: Array<{ slug: string; label: string; emoji: string }>
    } = await res.json()

    // 클라이언트 상태 업데이트
    setChallenges((prev) =>
      prev.map((c) =>
        c.id === challengeId
          ? { ...c, progress: c.progress + 1, completed: c.progress + 1 >= c.targetCount }
          : c
      )
    )
    addExp(data.expEarned)

    // 새로 획득한 뱃지 반영
    if (data.newBadges.length > 0) {
      setBadges((prev) =>
        prev.map((b) => {
          const newBadge = data.newBadges.find((nb) => nb.slug === b.slug)
          return newBadge ? { ...b, earned: true, earnedAt: new Date().toISOString() } : b
        })
      )
    }

    const badgeMsg =
      data.newBadges.length > 0
        ? ` · 뱃지 획득: ${data.newBadges.map((b) => b.emoji + b.label).join(', ')}`
        : ''
    const levelMsg = data.levelUp ? ' · 레벨 업! 🎉' : ''
    showToast(`+${data.expEarned} EXP 획득!${badgeMsg}${levelMsg}`)
  }

  // 오늘 출석 인증
  const handleCheckIn = async () => {
    setCheckInLoading(true)
    await new Promise((r) => setTimeout(r, 600)) // TODO: 실제 API 호출로 교체
    setCheckedInToday(true)
    setStreakDays((prev) => prev + 1)
    addExp(10)
    showToast('오늘 출석 인증 완료! +10 EXP')
    setCheckInLoading(false)
  }

  // 진행 현황 요약
  const completedCount = challenges.filter((c) => c.completed).length
  const totalExp = challenges.reduce(
    (sum, c) => sum + (c.completed ? c.expReward : 0),
    0
  )
  const overallPercent =
    challenges.length === 0
      ? 0
      : Math.round(
          (challenges.reduce(
            (sum, c) => sum + Math.min(c.progress / c.targetCount, 1),
            0
          ) /
            challenges.length) *
            100
        )

  return (
    <div className="relative min-h-[calc(100vh-56px)] bg-gradient-to-b from-indigo-50 to-purple-50 px-4 py-6">
      <div className="max-w-screen-md mx-auto space-y-6">

        {/* 페이지 헤더 */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">🏆 주간 챌린지</h1>
          <p className="mt-1 text-sm text-gray-500" style={{ wordBreak: 'keep-all' }}>
            말씀 암송·QT·기도 챌린지를 완료하고 경험치와 뱃지를 획득하세요
          </p>
          <p className="mt-1 text-xs text-gray-400">
            2026년 14주차 · 4월 7일(월) — 4월 13일(일)
          </p>
        </div>

        {/* 연속 출석 카운터 */}
        <StreakCounter
          streakDays={streakDays}
          checkedInToday={checkedInToday}
          onCheckIn={handleCheckIn}
          checkInLoading={checkInLoading}
        />

        {/* 내 주간 진행 현황 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-base font-bold text-gray-800 mb-3">📊 내 주간 현황</h2>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>
                  챌린지 {completedCount}/{challenges.length} 완료
                </span>
                <span className="font-semibold text-indigo-600">{overallPercent}%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                  style={{ width: `${overallPercent}%` }}
                />
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-xl font-black text-indigo-600 leading-none">{totalExp}</p>
              <p className="text-[11px] text-gray-400">획득 EXP</p>
            </div>
          </div>
          {completedCount === challenges.length && (
            <div
              className="text-center text-sm font-bold text-amber-600 bg-amber-50 rounded-xl py-2"
              style={{ wordBreak: 'keep-all' }}
            >
              🎊 이번 주 모든 챌린지 완료! 보너스 +20 EXP가 적립됩니다.
            </div>
          )}
        </div>

        {/* 챌린지 카드 목록 */}
        <div>
          <h2 className="text-base font-bold text-gray-800 mb-3">📋 이번 주 챌린지</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {challenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                {...challenge}
                onComplete={handleComplete}
              />
            ))}
          </div>
        </div>

        {/* 순 랭킹 보드 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <Leaderboard entries={LEADERBOARD} />
        </div>

        {/* 뱃지 컬렉션 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <BadgeDisplay badges={badges} />
        </div>

        <div className="h-6" />
      </div>

      {/* 토스트 알림 */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm font-semibold px-5 py-3 rounded-full shadow-xl animate-fade-in-up whitespace-nowrap"
          style={{ wordBreak: 'keep-all' }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
