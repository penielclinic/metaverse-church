'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── 타입 ──────────────────────────────────────────────────────
interface CellActivity {
  id: number
  name: string
  missionName: string | null
  leaderName: string | null
  memberCount: number
  meetingCount30d: number
  lastMeetingDate: string | null
  attendanceRate30d: number
  notes7d: number
  inactiveDays: number | null
  status: 'active' | 'warning' | 'inactive'
}

interface MemberStat {
  id: string
  name: string
  presentCount: number
  lateCount: number
  absentCount: number
  lastPresent: string | null
}

interface DateStat {
  date: string
  presentCount: number
  totalChecked: number
}

// ── 활동 상태 계산 ─────────────────────────────────────────────
function calcStatus(inactiveDays: number | null): CellActivity['status'] {
  if (inactiveDays === null) return 'inactive'
  if (inactiveDays <= 14) return 'active'
  if (inactiveDays <= 30) return 'warning'
  return 'inactive'
}

const STATUS_META = {
  active:   { dot: 'bg-emerald-400', label: '활성',   badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  warning:  { dot: 'bg-amber-400',   label: '주의',   badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  inactive: { dot: 'bg-red-400',     label: '비활성', badge: 'bg-red-50 text-red-600 border-red-200' },
}

function dayLabel(d: number | null) {
  if (d === null) return '모임 없음'
  if (d === 0) return '오늘'
  return `${d}일 전`
}

// ── 컴포넌트 ──────────────────────────────────────────────────
export default function CellActivityPage() {
  const supabase = createClient()

  const [cells, setCells] = useState<CellActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMission, setFilterMission] = useState<string>('전체')
  const [missions, setMissions] = useState<string[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [detail, setDetail] = useState<{ members: MemberStat[]; dates: DateStat[] } | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const today = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10)
  const ago30 = new Date(Date.now() + 9 * 3_600_000 - 30 * 86_400_000).toISOString().slice(0, 10)

  // ── 전체 셀 활동 요약 로드 ───────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)

      // cells + leader + members 수
      const { data: cellRows } = await (supabase as any)
        .from('cells')
        .select(`
          id, name, mission_id,
          missions ( name ),
          leader:profiles!cells_leader_id_fkey ( name ),
          members:profiles!profiles_cell_id_fkey ( id )
        `)
        .order('id')

      // 최근 30일 출석 로그 전체
      const { data: logs } = await (supabase as any)
        .from('attendance_logs')
        .select('cell_id, user_id, date, status')
        .gte('date', ago30)

      // 최근 7일 쪽지
      const ago7 = new Date(Date.now() + 9 * 3_600_000 - 7 * 86_400_000).toISOString()
      const { data: notes } = await (supabase as any)
        .from('cell_notes')
        .select('cell_id, created_at')
        .gte('created_at', ago7)

      // cell별 집계
      const logsByCellId: Record<number, { date: string; status: string; user_id: string }[]> = {}
      ;(logs ?? []).forEach((l: any) => {
        if (!logsByCellId[l.cell_id]) logsByCellId[l.cell_id] = []
        logsByCellId[l.cell_id].push(l)
      })
      const notes7dByCellId: Record<number, number> = {}
      ;(notes ?? []).forEach((n: any) => {
        notes7dByCellId[n.cell_id] = (notes7dByCellId[n.cell_id] ?? 0) + 1
      })

      const missionSet = new Set<string>()
      const result: CellActivity[] = (cellRows ?? []).map((c: any) => {
        const missionName = c.missions?.name ?? null
        if (missionName) missionSet.add(missionName)

        const cellLogs = logsByCellId[c.id] ?? []
        const dates = Array.from(new Set(cellLogs.map((l: any) => l.date as string))).sort()
        const meetingCount30d = dates.length
        const lastMeetingDate = dates.length ? dates[dates.length - 1] : null

        const presentCount = cellLogs.filter((l: any) => l.status === 'present').length
        const totalChecked = cellLogs.length
        const attendanceRate30d = totalChecked > 0 ? Math.round((presentCount / totalChecked) * 100) : 0

        const inactiveDays = lastMeetingDate
          ? Math.floor((Date.parse(today) - Date.parse(lastMeetingDate)) / 86_400_000)
          : null

        return {
          id: c.id,
          name: c.name,
          missionName,
          leaderName: c.leader?.name ?? null,
          memberCount: Array.isArray(c.members) ? c.members.length : 0,
          meetingCount30d,
          lastMeetingDate,
          attendanceRate30d,
          notes7d: notes7dByCellId[c.id] ?? 0,
          inactiveDays,
          status: calcStatus(inactiveDays),
        }
      })

      setMissions(['전체', ...Array.from(missionSet)])
      setCells(result)
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 셀 상세 출석 현황 로드 ───────────────────────────────────
  async function loadDetail(cellId: number) {
    if (expanded === cellId) { setExpanded(null); setDetail(null); return }
    setExpanded(cellId)
    setDetail(null)
    setLoadingDetail(true)

    // 성도 목록
    const { data: members } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('cell_id', cellId as any)
      .order('name')

    // 최근 8주 출석 로그
    const ago56 = new Date(Date.now() + 9 * 3_600_000 - 56 * 86_400_000).toISOString().slice(0, 10)
    const { data: logs } = await (supabase as any)
      .from('attendance_logs')
      .select('user_id, date, status')
      .eq('cell_id', cellId)
      .gte('date', ago56)
      .order('date', { ascending: false })

    // 성도별 집계
    const memberMap: Record<string, MemberStat> = {}
    ;(members ?? []).forEach((m: any) => {
      memberMap[m.id] = { id: m.id, name: m.name, presentCount: 0, lateCount: 0, absentCount: 0, lastPresent: null }
    })
    ;(logs ?? []).forEach((l: any) => {
      if (!memberMap[l.user_id]) return
      if (l.status === 'present') {
        memberMap[l.user_id].presentCount++
        if (!memberMap[l.user_id].lastPresent) memberMap[l.user_id].lastPresent = l.date
      } else if (l.status === 'late') memberMap[l.user_id].lateCount++
      else if (l.status === 'absent') memberMap[l.user_id].absentCount++
    })

    // 날짜별 집계 (최근 8회)
    const dateMap: Record<string, { present: number; total: number }> = {}
    ;(logs ?? []).forEach((l: any) => {
      if (!dateMap[l.date]) dateMap[l.date] = { present: 0, total: 0 }
      dateMap[l.date].total++
      if (l.status === 'present') dateMap[l.date].present++
    })
    const dates: DateStat[] = Object.entries(dateMap)
      .map(([date, v]) => ({ date, presentCount: v.present, totalChecked: v.total }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8)

    setDetail({
      members: Object.values(memberMap).sort((a, b) => b.presentCount - a.presentCount),
      dates,
    })
    setLoadingDetail(false)
  }

  // ── 필터링 ───────────────────────────────────────────────────
  const filtered = filterMission === '전체' ? cells : cells.filter(c => c.missionName === filterMission)

  // 선교회별 그룹핑
  const groups: Record<string, CellActivity[]> = {}
  filtered.forEach(c => {
    const key = c.missionName ?? '기타'
    if (!groups[key]) groups[key] = []
    groups[key].push(c)
  })

  // 전체 통계
  const totalActive   = cells.filter(c => c.status === 'active').length
  const totalWarning  = cells.filter(c => c.status === 'warning').length
  const totalInactive = cells.filter(c => c.status === 'inactive').length

  return (
    <div className="px-4 py-6 max-w-screen-md mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-1">📊 소그룹 활동 현황</h1>
      <p className="text-xs text-gray-400 mb-5" style={{ wordBreak: 'keep-all' }}>
        출석 체크 · 쪽지 기반 활동 지표 (최근 30일 기준)
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── 전체 요약 카드 ── */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: '활성', count: totalActive,   dot: 'bg-emerald-400', text: 'text-emerald-700' },
              { label: '주의', count: totalWarning,  dot: 'bg-amber-400',   text: 'text-amber-700'  },
              { label: '비활성', count: totalInactive, dot: 'bg-red-400',   text: 'text-red-600'    },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                  <span className="text-xs text-gray-500 font-medium whitespace-nowrap">{s.label}</span>
                </div>
                <p className={`text-2xl font-bold ${s.text}`}>{s.count}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">소그룹</p>
              </div>
            ))}
          </div>

          {/* ── 선교회 필터 탭 ── */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4 no-scrollbar">
            {missions.map(m => (
              <button
                key={m}
                onClick={() => setFilterMission(m)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                  filterMission === m
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* ── 그룹별 셀 목록 ── */}
          <div className="space-y-6">
            {Object.entries(groups).map(([groupName, groupCells]) => (
              <div key={groupName}>
                {/* 섹션 헤더 */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-sm font-bold text-gray-700 whitespace-nowrap">{groupName}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 whitespace-nowrap">{groupCells.length}개</span>
                </div>

                <div className="space-y-2">
                  {groupCells.map(cell => {
                    const sm = STATUS_META[cell.status]
                    const isExpanded = expanded === cell.id

                    return (
                      <div key={cell.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        {/* 셀 요약 행 */}
                        <button
                          onClick={() => loadDetail(cell.id)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            {/* 상태 도트 */}
                            <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${sm.dot}`} />

                            <div className="flex-1 min-w-0">
                              {/* 이름 + 상태 뱃지 */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-800 text-sm whitespace-nowrap">{cell.name}</span>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${sm.badge}`}>
                                  {sm.label}
                                </span>
                              </div>

                              {/* 순장 · 인원 */}
                              <p className="text-xs text-gray-400 mt-0.5">
                                <span className="whitespace-nowrap">순장 {cell.leaderName ?? '미정'}</span>
                                <span className="mx-1.5 text-gray-200">·</span>
                                <span className="whitespace-nowrap">{cell.memberCount}명</span>
                              </p>

                              {/* 지표 칩 */}
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">
                                  📅 모임 {cell.meetingCount30d}회
                                </span>
                                <span className={[
                                  'text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap',
                                  cell.attendanceRate30d >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                  cell.attendanceRate30d >= 50 ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-600',
                                ].join(' ')}>
                                  ✅ 출석률 {cell.attendanceRate30d}%
                                </span>
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">
                                  🕐 {dayLabel(cell.inactiveDays)}
                                </span>
                                {cell.notes7d > 0 && (
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 whitespace-nowrap">
                                    📝 쪽지 {cell.notes7d}건
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* 펼치기 화살표 */}
                            <span className={`text-gray-400 text-sm flex-shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                              ▾
                            </span>
                          </div>
                        </button>

                        {/* ── 펼쳐지는 상세 출석 현황 ── */}
                        {isExpanded && (
                          <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                            {loadingDetail ? (
                              <div className="flex justify-center py-6">
                                <div className="w-6 h-6 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                              </div>
                            ) : !detail ? null : (
                              <>
                                {/* 최근 모임 날짜별 현황 */}
                                {detail.dates.length > 0 && (
                                  <div className="mb-4">
                                    <p className="text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wide">최근 모임 출석</p>
                                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                      {detail.dates.map(d => {
                                        const rate = d.totalChecked > 0 ? Math.round((d.presentCount / d.totalChecked) * 100) : 0
                                        return (
                                          <div key={d.date} className="flex-shrink-0 text-center bg-white rounded-xl border border-gray-200 px-3 py-2 min-w-[68px] shadow-sm">
                                            <p className="text-[10px] text-gray-400 whitespace-nowrap">
                                              {d.date.slice(5).replace('-', '/')}
                                            </p>
                                            <p className={`text-base font-bold mt-0.5 ${
                                              rate >= 80 ? 'text-emerald-600' :
                                              rate >= 50 ? 'text-amber-600' : 'text-red-500'
                                            }`}>{rate}%</p>
                                            <p className="text-[10px] text-gray-400 whitespace-nowrap">
                                              {d.presentCount}/{d.totalChecked}명
                                            </p>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* 성도별 출석 통계 */}
                                {detail.members.length === 0 ? (
                                  <p className="text-sm text-gray-400 text-center py-4">배정된 성도가 없습니다.</p>
                                ) : (
                                  <div>
                                    <p className="text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wide">성도별 출석 현황 (최근 8주)</p>
                                    <div className="space-y-1">
                                      {detail.members.map(m => {
                                        const total = m.presentCount + m.lateCount + m.absentCount
                                        const rate = total > 0 ? Math.round((m.presentCount / total) * 100) : null
                                        return (
                                          <div key={m.id}
                                            className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-gray-100">
                                            {/* 이름 */}
                                            <span className="text-sm font-medium text-gray-800 whitespace-nowrap w-16 flex-shrink-0 truncate">
                                              {m.name}
                                            </span>

                                            {/* 출석 바 */}
                                            <div className="flex-1 min-w-0">
                                              {total > 0 ? (
                                                <div className="flex rounded-full overflow-hidden h-2 bg-gray-100">
                                                  {m.presentCount > 0 && (
                                                    <div className="bg-emerald-400 h-full" style={{ width: `${(m.presentCount / total) * 100}%` }} />
                                                  )}
                                                  {m.lateCount > 0 && (
                                                    <div className="bg-amber-400 h-full" style={{ width: `${(m.lateCount / total) * 100}%` }} />
                                                  )}
                                                  {m.absentCount > 0 && (
                                                    <div className="bg-red-300 h-full" style={{ width: `${(m.absentCount / total) * 100}%` }} />
                                                  )}
                                                </div>
                                              ) : (
                                                <div className="h-2 rounded-full bg-gray-100" />
                                              )}
                                            </div>

                                            {/* 수치 */}
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                              {rate !== null ? (
                                                <span className={`text-xs font-bold whitespace-nowrap ${
                                                  rate >= 80 ? 'text-emerald-600' :
                                                  rate >= 50 ? 'text-amber-600' : 'text-red-500'
                                                }`}>{rate}%</span>
                                              ) : (
                                                <span className="text-xs text-gray-300 whitespace-nowrap">기록없음</span>
                                              )}
                                              <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                {m.presentCount}출 {m.lateCount}지 {m.absentCount}결
                                              </span>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* 빈 상태 */}
                                {detail.dates.length === 0 && detail.members.length === 0 && (
                                  <div className="text-center py-6">
                                    <p className="text-3xl mb-2">📭</p>
                                    <p className="text-sm text-gray-400" style={{ wordBreak: 'keep-all' }}>
                                      최근 출석 기록이 없습니다.
                                    </p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">
              해당 선교회에 등록된 소그룹이 없습니다.
            </div>
          )}

          {/* 범례 */}
          <div className="mt-6 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-xs font-bold text-gray-500 mb-2">범례</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(STATUS_META).map(([key, v]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${v.dot}`} />
                  <span className="text-xs text-gray-600 whitespace-nowrap">
                    {v.label}: {key === 'active' ? '14일 이내' : key === 'warning' ? '15~30일' : '30일 초과 또는 미진행'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
