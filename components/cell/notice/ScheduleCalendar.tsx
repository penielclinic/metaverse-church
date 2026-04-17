'use client'

import { useState, useEffect, useCallback } from 'react'

type Schedule = {
  id: number
  cell_id: number
  title: string
  scheduled_at: string   // ISO string
  location: string | null
  description: string | null
  created_at: string
  type: 'regular' | 'special'
}

interface ScheduleCalendarProps {
  cellId: string
  isLeader: boolean
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function ScheduleCalendar({ cellId, isLeader }: ScheduleCalendarProps) {
  const today = new Date()
  const [viewYear, setViewYear]   = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-based
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<string | null>(null) // 'YYYY-MM-DD'
  const [showForm, setShowForm]   = useState(false)

  // 작성 폼
  const [fTitle, setFTitle]         = useState('')
  const [fDate, setFDate]           = useState('')
  const [fTime, setFTime]           = useState('14:00')
  const [fLocation, setFLocation]   = useState('')
  const [fDesc, setFDesc]           = useState('')
  const [fType, setFType]           = useState<'regular' | 'special'>('regular')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')

  // ── 일정 불러오기 ───────────────────────────────────────────
  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cell/notice?cellId=${cellId}&type=schedule`)
      if (!res.ok) throw new Error()
      const data: Schedule[] = await res.json()
      setSchedules(data)
    } catch {
      // 조용히 실패
    } finally {
      setLoading(false)
    }
  }, [cellId])

  useEffect(() => { fetchSchedules() }, [fetchSchedules])

  // ── 달력 계산 ────────────────────────────────────────────────
  const firstDay  = new Date(viewYear, viewMonth, 1).getDay() // 0=일
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  // 날짜별 일정 맵
  const schedulesByDate = schedules.reduce<Record<string, Schedule[]>>((acc, s) => {
    const key = s.scheduled_at.slice(0, 10)
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  const toKey = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate())

  // ── D-day 계산 ───────────────────────────────────────────────
  const upcoming = schedules
    .filter((s) => new Date(s.scheduled_at) >= today)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0]

  const dday = upcoming
    ? Math.ceil(
        (new Date(upcoming.scheduled_at.slice(0, 10)).getTime() -
          new Date(todayKey).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null

  // ── 일정 작성 ───────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fTitle.trim() || !fDate) {
      setFormError('제목과 날짜를 입력해주세요.')
      return
    }
    setSubmitting(true)
    setFormError('')
    try {
      const scheduledAt = `${fDate}T${fTime}:00`
      const res = await fetch('/api/cell/notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'schedule',
          cellId,
          title: fTitle,
          scheduled_at: scheduledAt,
          location: fLocation || null,
          description: fDesc || null,
          schedule_type: fType,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setFormError(err.error ?? '저장 실패')
        return
      }
      setFTitle('')
      setFDate('')
      setFTime('14:00')
      setFLocation('')
      setFDesc('')
      setShowForm(false)
      await fetchSchedules()
    } catch {
      setFormError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('이 일정을 삭제하시겠습니까?')) return
    await fetch(`/api/cell/notice?id=${id}&type=schedule`, { method: 'DELETE' })
    setSchedules((prev) => prev.filter((s) => s.id !== id))
  }

  // ── 달 이동 ──────────────────────────────────────────────────
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

  const selectedSchedules = selected ? (schedulesByDate[selected] ?? []) : []

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-800">📅 일정</h2>
          {dday !== null && (
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                dday === 0
                  ? 'bg-red-100 text-red-600'
                  : 'bg-purple-100 text-purple-700'
              }`}
            >
              {dday === 0 ? 'D-Day' : `D-${dday}`}
            </span>
          )}
        </div>
        {isLeader && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-xs px-3 py-1.5 bg-indigo-600 text-white font-semibold rounded-full hover:bg-indigo-700 transition-colors"
          >
            {showForm ? '취소' : '+ 일정 추가'}
          </button>
        )}
      </div>

      {/* 다음 일정 안내 */}
      {upcoming && (
        <div className="bg-purple-50 rounded-xl px-3.5 py-2.5 border border-purple-100">
          <p className="text-xs text-purple-500 font-semibold whitespace-nowrap">다음 모임</p>
          <p className="text-sm font-bold text-purple-800 mt-0.5" style={{ wordBreak: 'keep-all' }}>
            {upcoming.title}
          </p>
          <p className="text-xs text-purple-500 mt-0.5 whitespace-nowrap">
            {upcoming.scheduled_at.slice(0, 10).replace(/-/g, '/')}
            {upcoming.location ? ` · ${upcoming.location}` : ''}
          </p>
        </div>
      )}

      {/* 일정 작성 폼 */}
      {showForm && isLeader && (
        <form
          onSubmit={handleSubmit}
          className="bg-indigo-50 rounded-xl p-4 space-y-3 border border-indigo-100"
        >
          <input
            type="text"
            placeholder="일정 제목"
            value={fTitle}
            onChange={(e) => setFTitle(e.target.value)}
            maxLength={80}
            className="w-full text-sm border border-indigo-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={fDate}
              onChange={(e) => setFDate(e.target.value)}
              className="flex-1 text-sm border border-indigo-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              type="time"
              value={fTime}
              onChange={(e) => setFTime(e.target.value)}
              className="w-28 text-sm border border-indigo-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <input
            type="text"
            placeholder="장소 (선택)"
            value={fLocation}
            onChange={(e) => setFLocation(e.target.value)}
            maxLength={80}
            className="w-full text-sm border border-indigo-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <textarea
            placeholder="설명 (선택)"
            value={fDesc}
            onChange={(e) => setFDesc(e.target.value)}
            maxLength={300}
            rows={2}
            className="w-full text-sm border border-indigo-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(['regular', 'special'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFType(t)}
                  className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${
                    fType === t
                      ? t === 'regular'
                        ? 'bg-purple-600 text-white'
                        : 'bg-orange-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-600'
                  }`}
                >
                  {t === 'regular' ? '정기 모임' : '특별 일정'}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="text-sm px-4 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? '저장 중…' : '저장'}
            </button>
          </div>
          {formError && <p className="text-xs text-red-500">{formError}</p>}
        </form>
      )}

      {/* 달력 */}
      <div>
        {/* 달력 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label="이전 달"
          >
            ‹
          </button>
          <span className="text-sm font-bold text-gray-700">
            {viewYear}년 {viewMonth + 1}월
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label="다음 달"
          >
            ›
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d, i) => (
            <div
              key={d}
              className={`text-center text-[11px] font-semibold py-1 ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        {loading ? (
          <div className="py-4 text-center text-xs text-gray-400">불러오는 중…</div>
        ) : (
          <div className="grid grid-cols-7 gap-y-1">
            {/* 빈 셀 (첫 주 시작 전) */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {/* 날짜 셀 */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const key = toKey(viewYear, viewMonth, day)
              const daySchedules = schedulesByDate[key] ?? []
              const isToday = key === todayKey
              const isSelected = key === selected
              const hasRegular = daySchedules.some((s) => s.type === 'regular')
              const hasSpecial  = daySchedules.some((s) => s.type === 'special')
              const colIdx = (firstDay + i) % 7

              return (
                <button
                  key={key}
                  onClick={() => setSelected(isSelected ? null : key)}
                  className={`relative flex flex-col items-center py-1 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-indigo-100'
                      : isToday
                      ? 'bg-gray-100'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`text-xs font-medium ${
                      isToday
                        ? 'text-indigo-700 font-bold'
                        : colIdx === 0
                        ? 'text-red-400'
                        : colIdx === 6
                        ? 'text-blue-400'
                        : 'text-gray-700'
                    }`}
                  >
                    {day}
                  </span>
                  {/* 일정 도트 */}
                  {(hasRegular || hasSpecial) && (
                    <div className="flex gap-0.5 mt-0.5">
                      {hasRegular && (
                        <span className="w-1 h-1 rounded-full bg-purple-500" />
                      )}
                      {hasSpecial && (
                        <span className="w-1 h-1 rounded-full bg-orange-400" />
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* 범례 */}
        <div className="flex gap-3 mt-3 justify-end">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-[11px] text-gray-500">정기</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-[11px] text-gray-500">특별</span>
          </div>
        </div>
      </div>

      {/* 선택 날짜 일정 상세 */}
      {selected && (
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500">
            {selected.replace(/-/g, '/')} 일정
          </p>
          {selectedSchedules.length === 0 ? (
            <p className="text-sm text-gray-400">등록된 일정이 없습니다.</p>
          ) : (
            selectedSchedules.map((s) => (
              <div
                key={s.id}
                className={`rounded-xl px-3.5 py-3 border ${
                  s.type === 'special'
                    ? 'bg-orange-50 border-orange-100'
                    : 'bg-purple-50 border-purple-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className="text-sm font-bold text-gray-800"
                      style={{ wordBreak: 'keep-all' }}
                    >
                      {s.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">
                      {formatTime(s.scheduled_at)}
                      {s.location ? ` · ${s.location}` : ''}
                    </p>
                    {s.description && (
                      <p
                        className="text-xs text-gray-600 mt-1"
                        style={{ wordBreak: 'keep-all' }}
                      >
                        {s.description}
                      </p>
                    )}
                  </div>
                  {isLeader && (
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-xs text-gray-400 hover:text-red-500 flex-shrink-0 transition-colors"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
