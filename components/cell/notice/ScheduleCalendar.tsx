'use client'

import { useState, useEffect, useCallback } from 'react'

type Schedule = {
  id: number
  cell_id: number
  title: string
  scheduled_at: string
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
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [selected,  setSelected]  = useState<string | null>(null)
  const [showForm,  setShowForm]  = useState(false)

  const [fTitle,     setFTitle]     = useState('')
  const [fDate,      setFDate]      = useState('')
  const [fTime,      setFTime]      = useState('14:00')
  const [fLocation,  setFLocation]  = useState('')
  const [fDesc,      setFDesc]      = useState('')
  const [fType,      setFType]      = useState<'regular' | 'special'>('regular')
  const [submitting, setSubmitting] = useState(false)
  const [formError,  setFormError]  = useState('')

  const fetchSchedules = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/cell/notice?cellId=${cellId}&type=schedule`)
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? '일정을 불러오지 못했습니다.')
        return
      }
      const data: Schedule[] = await res.json()
      setSchedules(data)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [cellId])

  useEffect(() => { fetchSchedules() }, [fetchSchedules])

  // 달력 계산
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const schedulesByDate = schedules.reduce<Record<string, Schedule[]>>((acc, s) => {
    const key = s.scheduled_at.slice(0, 10)
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  const toKey = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate())

  // 다음 일정 D-day
  const upcoming = schedules
    .filter(s => new Date(s.scheduled_at) >= today)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0]

  const dday = upcoming
    ? Math.ceil((new Date(upcoming.scheduled_at.slice(0, 10)).getTime() - new Date(todayKey).getTime()) / 86_400_000)
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fTitle.trim() || !fDate) { setFormError('제목과 날짜를 입력해주세요.'); return }
    setSubmitting(true); setFormError('')
    try {
      const res = await fetch('/api/cell/notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'schedule', cellId,
          title: fTitle, scheduled_at: `${fDate}T${fTime}:00`,
          location: fLocation || null, description: fDesc || null, schedule_type: fType,
        }),
      })
      if (!res.ok) { const err = await res.json(); setFormError(err.error ?? '저장 실패'); return }
      setFTitle(''); setFDate(''); setFTime('14:00'); setFLocation(''); setFDesc(''); setShowForm(false)
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
    setSchedules(prev => prev.filter(s => s.id !== id))
    setSelected(null)
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const selectedSchedules = selected ? (schedulesByDate[selected] ?? []) : []

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(251,191,36,0.2)' }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(251,191,36,0.1)' }}>
        <div className="flex items-center gap-2">
          <span className="text-base">📅</span>
          <h2 className="text-sm font-bold text-amber-200">일정</h2>
          {dday !== null && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
              dday === 0 ? 'bg-red-500/30 text-red-300' : 'bg-purple-500/30 text-purple-300'
            }`}>
              {dday === 0 ? 'D-Day' : `D-${dday}`}
            </span>
          )}
        </div>
        {isLeader && (
          <button onClick={() => setShowForm(v => !v)}
            className="text-xs px-3 py-1.5 font-semibold rounded-full transition-colors"
            style={{ background: showForm ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.7)', color: 'white' }}>
            {showForm ? '취소' : '+ 일정 추가'}
          </button>
        )}
      </div>

      {/* 다음 일정 배너 */}
      {upcoming && (
        <div className="mx-4 mt-3 px-3.5 py-2.5 rounded-xl" style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)' }}>
          <p className="text-[11px] text-purple-400 font-semibold whitespace-nowrap">다음 모임</p>
          <p className="text-sm font-bold text-purple-200 mt-0.5" style={{ wordBreak: 'keep-all' }}>{upcoming.title}</p>
          <p className="text-xs text-purple-400 mt-0.5">
            <span className="whitespace-nowrap">{upcoming.scheduled_at.slice(0, 10).replace(/-/g, '/')}</span>
            {upcoming.location && <span className="whitespace-nowrap"> · {upcoming.location}</span>}
          </p>
        </div>
      )}

      {/* 일정 추가 폼 */}
      {showForm && isLeader && (
        <form onSubmit={handleSubmit} className="mx-4 mt-3 p-3 rounded-xl space-y-2.5" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <input type="text" placeholder="일정 제목" value={fTitle} onChange={e => setFTitle(e.target.value)} maxLength={80}
            className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none text-white placeholder-slate-500"
            style={{ background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(99,102,241,0.4)' }} />
          <div className="flex gap-2">
            <input type="date" value={fDate} onChange={e => setFDate(e.target.value)}
              className="flex-1 text-sm rounded-lg px-2 py-2 focus:outline-none text-white"
              style={{ background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(99,102,241,0.4)' }} />
            <input type="time" value={fTime} onChange={e => setFTime(e.target.value)}
              className="w-28 text-sm rounded-lg px-2 py-2 focus:outline-none text-white"
              style={{ background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(99,102,241,0.4)' }} />
          </div>
          <input type="text" placeholder="장소 (선택)" value={fLocation} onChange={e => setFLocation(e.target.value)} maxLength={80}
            className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none text-white placeholder-slate-500"
            style={{ background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(99,102,241,0.4)' }} />
          <textarea placeholder="설명 (선택)" value={fDesc} onChange={e => setFDesc(e.target.value)} maxLength={300} rows={2}
            className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none text-white placeholder-slate-500 resize-none"
            style={{ background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(99,102,241,0.4)' }} />
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(['regular', 'special'] as const).map(t => (
                <button key={t} type="button" onClick={() => setFType(t)}
                  className="text-xs px-3 py-1 rounded-full font-semibold transition-colors"
                  style={fType === t
                    ? { background: t === 'regular' ? 'rgba(139,92,246,0.8)' : 'rgba(249,115,22,0.8)', color: 'white' }
                    : { background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }
                  }>
                  {t === 'regular' ? '정기 모임' : '특별 일정'}
                </button>
              ))}
            </div>
            <button type="submit" disabled={submitting}
              className="text-sm px-4 py-1.5 font-semibold rounded-lg disabled:opacity-50 transition-colors"
              style={{ background: 'rgba(99,102,241,0.8)', color: 'white' }}>
              {submitting ? '저장 중…' : '저장'}
            </button>
          </div>
          {formError && <p className="text-xs text-red-400">{formError}</p>}
        </form>
      )}

      {/* 달력 */}
      <div className="px-4 pt-3 pb-1">
        {/* 달력 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-amber-300 text-lg" aria-label="이전 달">‹</button>
          <span className="text-sm font-bold text-slate-200">{viewYear}년 {viewMonth + 1}월</span>
          <button onClick={nextMonth} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-amber-300 text-lg" aria-label="다음 달">›</button>
        </div>

        {/* 요일 */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d, i) => (
            <div key={d} className={`text-center text-[11px] font-semibold py-1 ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-500'
            }`}>{d}</div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        {loading ? (
          <div className="py-6 flex justify-center">
            <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="py-4 text-center">
            <p className="text-xs text-red-400">{error}</p>
            <button onClick={fetchSchedules} className="mt-1 text-xs text-amber-400 underline">다시 시도</button>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-y-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const key = toKey(viewYear, viewMonth, day)
              const daySchedules = schedulesByDate[key] ?? []
              const isToday    = key === todayKey
              const isSelected = key === selected
              const hasRegular = daySchedules.some(s => s.type === 'regular')
              const hasSpecial  = daySchedules.some(s => s.type === 'special')
              const colIdx = (firstDay + i) % 7

              return (
                <button key={key} onClick={() => setSelected(isSelected ? null : key)}
                  className="relative flex flex-col items-center py-1 rounded-lg transition-colors"
                  style={{ background: isSelected ? 'rgba(99,102,241,0.3)' : isToday ? 'rgba(255,255,255,0.07)' : 'transparent' }}>
                  <span className={`text-xs font-medium ${
                    isToday ? 'text-indigo-300 font-bold' : colIdx === 0 ? 'text-red-400' : colIdx === 6 ? 'text-blue-400' : 'text-slate-300'
                  }`}>{day}</span>
                  {(hasRegular || hasSpecial) && (
                    <div className="flex gap-0.5 mt-0.5">
                      {hasRegular && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                      {hasSpecial  && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* 범례 */}
        <div className="flex gap-3 mt-2 mb-1 justify-end">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="text-[11px] text-slate-500">정기</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-[11px] text-slate-500">특별</span>
          </div>
        </div>
      </div>

      {/* 선택 날짜 일정 */}
      {selected && (
        <div className="mx-4 mb-4 mt-1 space-y-2">
          <p className="text-xs font-semibold text-slate-500 pt-1">
            {selected.replace(/-/g, '/')} 일정
          </p>
          {selectedSchedules.length === 0 ? (
            <p className="text-sm text-slate-600 pb-2">등록된 일정이 없습니다.</p>
          ) : (
            selectedSchedules.map(s => (
              <div key={s.id} className="rounded-xl px-3.5 py-3"
                style={{
                  background: s.type === 'special' ? 'rgba(249,115,22,0.12)' : 'rgba(139,92,246,0.12)',
                  border: `1px solid ${s.type === 'special' ? 'rgba(249,115,22,0.3)' : 'rgba(139,92,246,0.3)'}`,
                }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-100" style={{ wordBreak: 'keep-all' }}>{s.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      <span className="whitespace-nowrap">{formatTime(s.scheduled_at)}</span>
                      {s.location && <span className="whitespace-nowrap"> · {s.location}</span>}
                    </p>
                    {s.description && (
                      <p className="text-xs text-slate-400 mt-1" style={{ wordBreak: 'keep-all' }}>{s.description}</p>
                    )}
                  </div>
                  {isLeader && (
                    <button onClick={() => handleDelete(s.id)} className="text-xs text-slate-600 hover:text-red-400 flex-shrink-0 transition-colors">삭제</button>
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
