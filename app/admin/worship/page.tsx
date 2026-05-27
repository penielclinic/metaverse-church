'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface WorshipDay {
  date: string
  viewers: { name: string; role: string }[]
  reactions: { amen: number; clap: number; hallelujah: number }
}

const ROLE_LABEL: Record<string, string> = {
  pastor: '담임목사', school_pastor: '교회학교 목사', mission_leader: '선교회장',
  youth_pastor: '청년부 교역자', school_teacher: '교회학교 교사',
  youth_leader: '청년회장', youth_vice_leader: '청년부회장', youth_secretary: '청년부총무',
  cell_leader: '순장', youth: '청년', member: '성도', elder: '장로',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}. (${day})`
}

export default function WorshipPage() {
  const [days, setDays] = useState<WorshipDay[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      // 시청 기록 + 성도 이름
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: views } = await (supabase as any)
        .from('worship_views')
        .select('worship_date, profiles(name, role)')
        .order('worship_date', { ascending: false })

      // 반응 기록
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: reactions } = await (supabase as any)
        .from('worship_reactions')
        .select('worship_date, reaction')

      // 날짜별 집계
      const dayMap = new Map<string, WorshipDay>()

      for (const v of views ?? []) {
        const d = v.worship_date as string
        if (!dayMap.has(d)) {
          dayMap.set(d, { date: d, viewers: [], reactions: { amen: 0, clap: 0, hallelujah: 0 } })
        }
        const day = dayMap.get(d)!
        if (v.profiles) {
          day.viewers.push({ name: v.profiles.name ?? '—', role: v.profiles.role ?? 'member' })
        }
      }

      for (const r of reactions ?? []) {
        const d = r.worship_date as string
        if (!dayMap.has(d)) {
          dayMap.set(d, { date: d, viewers: [], reactions: { amen: 0, clap: 0, hallelujah: 0 } })
        }
        const day = dayMap.get(d)!
        const key = r.reaction as 'amen' | 'clap' | 'hallelujah'
        if (key in day.reactions) day.reactions[key]++
      }

      setDays(Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date)))
      setLoading(false)
    }
    load()
  }, [])

  const totalReactions = (r: WorshipDay['reactions']) => r.amen + r.clap + r.hallelujah

  return (
    <div className="px-4 py-6 max-w-screen-md mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-1">📺 예배 현황</h1>
      <p className="text-xs text-gray-400 mb-5" style={{ wordBreak: 'keep-all' }}>
        라이브 예배 시청 및 반응(아멘·박수·할렐루야) 기록입니다
      </p>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && days.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm" style={{ wordBreak: 'keep-all' }}>
          아직 예배 기록이 없습니다.<br />
          본당에서 예배를 시청하거나 반응 버튼을 누르면 이곳에 기록됩니다.
        </div>
      )}

      {!loading && days.length > 0 && (
        <div className="space-y-3">
          {days.map((day) => {
            const isOpen = expanded === day.date
            const total = totalReactions(day.reactions)

            return (
              <div key={day.date} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* 날짜 헤더 */}
                <button
                  className="w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : day.date)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 text-sm whitespace-nowrap">
                        {formatDate(day.date)}
                      </p>
                      {/* 요약 통계 */}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          👥 시청 {day.viewers.length}명
                        </span>
                        {total > 0 && (
                          <>
                            {day.reactions.amen > 0 && (
                              <span className="text-xs text-gray-500 whitespace-nowrap">🙏 {day.reactions.amen}</span>
                            )}
                            {day.reactions.clap > 0 && (
                              <span className="text-xs text-gray-500 whitespace-nowrap">👏 {day.reactions.clap}</span>
                            )}
                            {day.reactions.hallelujah > 0 && (
                              <span className="text-xs text-gray-500 whitespace-nowrap">✝️ {day.reactions.hallelujah}</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <span className={['text-gray-400 transition-transform duration-200', isOpen ? 'rotate-90' : ''].join(' ')}>›</span>
                  </div>
                </button>

                {/* 펼침: 시청자 목록 */}
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    {/* 반응 합계 바 */}
                    {total > 0 && (
                      <div className="flex gap-3 py-3 border-b border-gray-100">
                        <div className="flex flex-col items-center gap-0.5 flex-1">
                          <span className="text-xl">🙏</span>
                          <span className="text-xs font-bold text-gray-700">{day.reactions.amen}</span>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">아멘</span>
                        </div>
                        <div className="flex flex-col items-center gap-0.5 flex-1">
                          <span className="text-xl">👏</span>
                          <span className="text-xs font-bold text-gray-700">{day.reactions.clap}</span>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">박수</span>
                        </div>
                        <div className="flex flex-col items-center gap-0.5 flex-1">
                          <span className="text-xl">✝️</span>
                          <span className="text-xs font-bold text-gray-700">{day.reactions.hallelujah}</span>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">할렐루야</span>
                        </div>
                        <div className="flex flex-col items-center gap-0.5 flex-1">
                          <span className="text-xl">🔥</span>
                          <span className="text-xs font-bold text-indigo-600">{total}</span>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">전체</span>
                        </div>
                      </div>
                    )}

                    {/* 시청자 이름 목록 */}
                    <p className="text-[11px] font-semibold text-gray-400 mt-3 mb-2">시청한 성도</p>
                    {day.viewers.length === 0 ? (
                      <p className="text-xs text-gray-400">기록된 시청자가 없습니다</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {day.viewers.map((v, i) => (
                          <span
                            key={i}
                            className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full whitespace-nowrap"
                          >
                            {v.name}
                            {v.role !== 'member' && v.role !== 'youth' && (
                              <span className="ml-1 text-indigo-400 text-[10px]">
                                {ROLE_LABEL[v.role] ?? v.role}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
