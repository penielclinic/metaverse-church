'use client'

import { useState, useEffect } from 'react'
import ChallengeCard, { type ChallengeCardProps } from '@/components/challenge/ChallengeCard'
import BadgeDisplay, { type Badge } from '@/components/challenge/BadgeDisplay'
import StreakCounter from '@/components/challenge/StreakCounter'
import Leaderboard, { type LeaderboardEntry } from '@/components/challenge/Leaderboard'
import { useAvatarStore } from '@/store/avatarStore'

// 2026-04-07 시즌 시작 기준 주차 라벨 (UI용)
function getWeekLabel(weekNum: number): string {
  const SEASON_START = new Date('2026-04-07T00:00:00+09:00')
  const monDate = new Date(SEASON_START)
  monDate.setDate(monDate.getDate() + (weekNum - 1) * 7)
  const sunDate = new Date(monDate)
  sunDate.setDate(sunDate.getDate() + 6)
  const fmt = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`
  const DAY  = ['일','월','화','수','목','금','토']
  return `2026년 ${weekNum}주차 · ${fmt(monDate)}(${DAY[monDate.getDay()]}) — ${fmt(sunDate)}(${DAY[sunDate.getDay()]})`
}

type ChallengeData = Omit<ChallengeCardProps, 'onComplete'> & { progress: number }

export default function ChallengePage() {
  const { addExp } = useAvatarStore()

  const [loading,         setLoading]         = useState(true)
  const [challenges,      setChallenges]      = useState<ChallengeData[]>([])
  const [badges,          setBadges]          = useState<Badge[]>([])
  const [streakDays,      setStreakDays]       = useState(0)
  const [checkedInToday,  setCheckedInToday]  = useState(false)
  const [checkInLoading,  setCheckInLoading]  = useState(false)
  const [leaderboard,     setLeaderboard]     = useState<LeaderboardEntry[]>([])
  const [weekNum,         setWeekNum]         = useState(1)
  const [toast,           setToast]           = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  // 초기 데이터 로드 (병렬)
  useEffect(() => {
    Promise.all([
      fetch('/api/challenge/list').then(r => r.ok ? r.json() : null),
      fetch('/api/challenge/badges').then(r => r.ok ? r.json() : null),
      fetch('/api/avatar').then(r => r.ok ? r.json() : null),
      fetch('/api/challenge/leaderboard').then(r => r.ok ? r.json() : null),
    ]).then(([list, badgeData, me, board]) => {
      // 챌린지
      if (list?.challenges) {
        setChallenges(list.challenges)
        setWeekNum(list.weekNum ?? 1)
      }
      // 뱃지
      if (badgeData?.badges) setBadges(badgeData.badges)
      // 스트릭
      if (me?.avatar) {
        const a = me.avatar
        setStreakDays(a.devotion_streak ?? 0)
        const todayKST = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10)
        setCheckedInToday(a.last_devotion_date === todayKST)
      }
      // 랭킹
      if (board?.entries) {
        const myCellId = me?.avatar?.cell_id ?? null
        const entries: LeaderboardEntry[] = board.entries.map(
          (e: { rank: number; cellName: string; exp: number; memberCount: number; cellId: number }) => ({
            rank:        e.rank,
            cellName:    e.cellName,
            exp:         e.exp,
            memberCount: e.memberCount,
            isMyCell:    myCellId !== null && e.cellId === myCellId,
          })
        )
        setLeaderboard(entries)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // 챌린지 완료
  const handleComplete = async (challengeId: number) => {
    const res = await fetch('/api/challenge/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId }),
    })

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      showToast(d.error ?? '완료 처리에 실패했습니다.')
      return
    }

    const data: {
      success: boolean; expEarned: number; levelUp: boolean
      newBadges: Array<{ slug: string; label: string; emoji: string }>
    } = await res.json()

    setChallenges(prev =>
      prev.map(c =>
        c.id === challengeId
          ? { ...c, progress: c.progress + 1, completed: c.progress + 1 >= c.targetCount }
          : c
      )
    )
    if (data.expEarned > 0) addExp(data.expEarned)

    if (data.newBadges?.length > 0) {
      setBadges(prev =>
        prev.map(b => {
          const nb = data.newBadges.find(n => n.slug === b.slug)
          return nb ? { ...b, earned: true, earnedAt: new Date().toISOString() } : b
        })
      )
    }

    const badgeMsg = data.newBadges?.length > 0
      ? ` · 뱃지 획득: ${data.newBadges.map(b => b.emoji + b.label).join(', ')}` : ''
    const levelMsg = data.levelUp ? ' · 레벨 업! 🎉' : ''
    showToast(data.expEarned > 0 ? `+${data.expEarned} EXP 획득!${badgeMsg}${levelMsg}` : '진행도 +1!')
  }

  // 출석 인증
  const handleCheckIn = async () => {
    setCheckInLoading(true)
    try {
      const res = await fetch('/api/challenge/checkin', { method: 'POST' })
      if (!res.ok) { showToast('인증 실패. 다시 시도해주세요.'); return }

      const data: {
        alreadyCheckedIn: boolean; streak: number; expEarned: number
        levelUp: boolean; badgeEarned: { slug: string; label: string; emoji: string } | null
      } = await res.json()

      if (data.alreadyCheckedIn) { showToast('오늘은 이미 출석 인증했습니다. ✅'); return }

      setStreakDays(data.streak)
      setCheckedInToday(true)
      addExp(data.expEarned)

      if (data.badgeEarned) {
        setBadges(prev =>
          prev.map(b => b.slug === data.badgeEarned!.slug
            ? { ...b, earned: true, earnedAt: new Date().toISOString() } : b)
        )
      }

      const badgeMsg = data.badgeEarned ? ` · 🔥 ${data.badgeEarned.label} 뱃지 획득!` : ''
      const levelMsg = data.levelUp ? ' · 레벨 업! 🎉' : ''
      showToast(`오늘 출석 인증 완료! +${data.expEarned} EXP${badgeMsg}${levelMsg}`)
    } finally {
      setCheckInLoading(false)
    }
  }

  // 진행 현황 요약
  const completedCount  = challenges.filter(c => c.completed).length
  const totalExp        = challenges.reduce((s, c) => s + (c.completed ? c.expReward : 0), 0)
  const overallPercent  = challenges.length === 0 ? 0 : Math.round(
    (challenges.reduce((s, c) => s + Math.min(c.progress / c.targetCount, 1), 0) / challenges.length) * 100
  )

  return (
    <div className="relative min-h-[calc(100vh-56px)] bg-gradient-to-b from-indigo-50 to-purple-50 px-4 py-6">
      <div className="max-w-screen-md mx-auto space-y-6">

        {/* 페이지 헤더 */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">🏆 주간 챌린지</h1>
          <p className="mt-1 text-sm text-gray-500" style={{ wordBreak: 'keep-all' }}>
            말씀 묵상·기도·예배 챌린지를 완료하고 경험치와 뱃지를 획득하세요
          </p>
          <p className="mt-1 text-xs text-gray-400">{getWeekLabel(weekNum)}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* 연속 출석 */}
            <StreakCounter
              streakDays={streakDays}
              checkedInToday={checkedInToday}
              onCheckIn={handleCheckIn}
              checkInLoading={checkInLoading}
            />

            {/* 내 주간 현황 */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <h2 className="text-base font-bold text-gray-800 mb-3">📊 내 주간 현황</h2>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>챌린지 {completedCount}/{challenges.length} 완료</span>
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
              {completedCount === challenges.length && challenges.length > 0 && (
                <div className="text-center text-sm font-bold text-amber-600 bg-amber-50 rounded-xl py-2" style={{ wordBreak: 'keep-all' }}>
                  🎊 이번 주 모든 챌린지 완료! 보너스 +20 EXP가 적립됩니다.
                </div>
              )}
            </div>

            {/* 챌린지 카드 */}
            <div>
              <h2 className="text-base font-bold text-gray-800 mb-3">📋 이번 주 챌린지</h2>
              {challenges.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">등록된 챌린지가 없습니다.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {challenges.map(challenge => (
                    <ChallengeCard
                      key={challenge.id}
                      {...challenge}
                      onComplete={handleComplete}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 순 랭킹 */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              {leaderboard.length > 0 ? (
                <Leaderboard entries={leaderboard} />
              ) : (
                <div className="text-center py-6 text-sm text-gray-400">
                  <p className="text-2xl mb-2">🏆</p>
                  <p style={{ wordBreak: 'keep-all' }}>아직 승인된 순원이 없습니다.</p>
                  <p style={{ wordBreak: 'keep-all' }}>순 배치 신청 후 활동을 시작해보세요!</p>
                </div>
              )}
            </div>

            {/* 뱃지 컬렉션 */}
            {badges.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <BadgeDisplay badges={badges} />
              </div>
            )}
          </>
        )}

        <div className="h-6" />
      </div>

      {/* 토스트 */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm font-semibold px-5 py-3 rounded-full shadow-xl whitespace-nowrap"
          style={{ wordBreak: 'keep-all' }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
