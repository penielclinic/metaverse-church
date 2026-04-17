'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface MemberStat {
  id: string
  name: string
  total: number
  present: number
  late: number
  absent: number
  rate: number
  isPerfect: boolean
}

interface AttendanceSummaryProps {
  cellId: number
  year?: number
  month?: number
}

export default function AttendanceSummary({ cellId, year, month }: AttendanceSummaryProps) {
  const now   = new Date()
  const y     = year  ?? now.getFullYear()
  const m     = month ?? now.getMonth() + 1

  const [stats, setStats]   = useState<MemberStat[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchStats = useCallback(async () => {
    setLoading(true)

    // 이번 달 범위
    const from = `${y}-${String(m).padStart(2, '0')}-01`
    const to   = `${y}-${String(m).padStart(2, '0')}-31`

    // 순원 목록
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profilesData } = await (supabase as any)
      .from('profiles')
      .select('id, name')
      .eq('cell_id', cellId)

    // 해당 달 출석 로그
    const { data: logs } = await supabase
      .from('attendance_logs' as never)
      .select('user_id, status, date')
      .eq('cell_id', cellId as never)
      .gte('date', from as never)
      .lte('date', to as never)

    // 총 모임 횟수 (날짜 unique)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meetingDates = new Set((logs ?? []).map((l: any) => l.date))
    const totalMeetings = meetingDates.size || 1

    const result: MemberStat[] = (profilesData ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const memberLogs = (logs ?? []).filter((l: any) => l.user_id === p.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const present = memberLogs.filter((l: any) => l.status === 'present').length
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const late    = memberLogs.filter((l: any) => l.status === 'late').length
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const absent  = memberLogs.filter((l: any) => l.status === 'absent').length
        const rate    = Math.round(((present + late * 0.5) / totalMeetings) * 100)

        return {
          id: p.id,
          name: p.name,
          total: totalMeetings,
          present,
          late,
          absent,
          rate: Math.min(rate, 100),
          isPerfect: present === totalMeetings && totalMeetings > 0,
        }
      }
    )

    // 출석률 높은 순 정렬
    result.sort((a, b) => b.rate - a.rate)
    setStats(result)
    setLoading(false)
  }, [cellId, y, m])

  useEffect(() => { fetchStats() }, [fetchStats])

  const monthLabel = `${y}년 ${m}월`

  const rateColor = (rate: number) => {
    if (rate >= 90) return 'bg-emerald-500'
    if (rate >= 70) return 'bg-blue-500'
    if (rate >= 50) return 'bg-yellow-400'
    return 'bg-red-400'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        통계 불러오는 중...
      </div>
    )
  }

  const perfectMembers = stats.filter(s => s.isPerfect)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-800 text-base">
          {monthLabel} 출석 통계
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          총 모임 {stats[0]?.total ?? 0}회 기준
        </p>
      </div>

      {/* 개근자 뱃지 */}
      {perfectMembers.length > 0 && (
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
          <p className="text-xs font-semibold text-amber-700 mb-2">
            🏅 이달의 개근자
          </p>
          <div className="flex flex-wrap gap-2">
            {perfectMembers.map(m => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-1 rounded-full border border-amber-200 whitespace-nowrap"
              >
                🏅 {m.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 순원별 바 차트 */}
      <ul className="divide-y divide-gray-50 px-5 py-2">
        {stats.map((s, idx) => (
          <li key={s.id} className="py-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-4 text-right">{idx + 1}</span>
                <span className="text-sm font-medium text-gray-800 whitespace-nowrap">
                  {s.name}
                  {s.isPerfect && <span className="ml-1">🏅</span>}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="text-green-600">✅ {s.present}</span>
                <span className="text-yellow-600">🕐 {s.late}</span>
                <span className="text-red-500">❌ {s.absent}</span>
                <span className={`font-bold ml-1 ${s.rate >= 90 ? 'text-emerald-600' : s.rate >= 70 ? 'text-blue-600' : 'text-red-500'}`}>
                  {s.rate}%
                </span>
              </div>
            </div>
            {/* 바 차트 */}
            <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${rateColor(s.rate)}`}
                style={{ width: `${s.rate}%` }}
              />
            </div>
          </li>
        ))}

        {stats.length === 0 && (
          <li className="text-center text-gray-400 text-sm py-8">
            출석 데이터가 없습니다.
          </li>
        )}
      </ul>

      {/* 범례 */}
      <div className="px-5 pb-4 flex gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>90%+</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"/>70%+</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"/>50%+</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>~50%</span>
      </div>
    </div>
  )
}
