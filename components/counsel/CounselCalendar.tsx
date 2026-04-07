'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const METHOD_OPTIONS = [
  { value: 'metaverse', label: '메타버스 채팅', emoji: '💬' },
  { value: 'phone', label: '전화 상담', emoji: '📞' },
  { value: 'in_person', label: '대면 상담', emoji: '🤝' },
] as const

type Method = (typeof METHOD_OPTIONS)[number]['value']

interface Counselor {
  id: string
  name: string
  role: string
}

interface Props {
  onClose: () => void
  onSuccess: () => void
}

// 오늘부터 7일치 날짜 생성
function getNextDays(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })
}

// 상담 가능 시간 슬롯 (오전 9시 ~ 오후 6시, 30분 단위)
function getTimeSlots() {
  const slots: string[] = []
  for (let h = 9; h < 18; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
}

const DAYS = getNextDays(7)
const TIME_SLOTS = getTimeSlots()

export default function CounselCalendar({ onClose, onSuccess }: Props) {
  const [counselors, setCounselors] = useState<Counselor[]>([])
  const [selectedCounselor, setSelectedCounselor] = useState<string>('')
  const [selectedDay, setSelectedDay] = useState<Date>(DAYS[0])
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [method, setMethod] = useState<Method>('metaverse')
  const [duration, setDuration] = useState<30 | 60>(30)
  const [note, setNote] = useState('')
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  // 교역자 목록 로드
  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, name, role')
      .in('role', ['pastor', 'mission_leader'])
      .then(({ data }) => {
        if (data) {
          setCounselors(data)
          if (data.length > 0) setSelectedCounselor(data[0].id)
        }
      })
  }, [])

  // 선택된 교역자·날짜의 예약된 슬롯 로드
  useEffect(() => {
    if (!selectedCounselor) return

    const dayStart = new Date(selectedDay)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(selectedDay)
    dayEnd.setHours(23, 59, 59, 999)

    supabase
      .from('counsel_bookings')
      .select('scheduled_at, duration_min')
      .eq('counselor_id', selectedCounselor)
      .not('status', 'eq', 'cancelled')
      .gte('scheduled_at', dayStart.toISOString())
      .lte('scheduled_at', dayEnd.toISOString())
      .then(({ data }) => {
        const occupied = new Set<string>()
        data?.forEach((b) => {
          const start = new Date(b.scheduled_at)
          const slots = b.duration_min / 30
          for (let i = 0; i < slots; i++) {
            const t = new Date(start.getTime() + i * 30 * 60_000)
            occupied.add(
              `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
            )
          }
        })
        setBookedSlots(occupied)
        setSelectedTime('')
      })
  }, [selectedCounselor, selectedDay])

  const handleBook = async () => {
    if (!selectedCounselor || !selectedTime) {
      setError('교역자와 시간을 선택해주세요.')
      return
    }
    setError('')
    setSubmitting(true)

    const [hour, min] = selectedTime.split(':').map(Number)
    const scheduled = new Date(selectedDay)
    scheduled.setHours(hour, min, 0, 0)

    try {
      const res = await fetch('/api/counsel/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counselor_id: selectedCounselor,
          scheduled_at: scheduled.toISOString(),
          duration_min: duration,
          method,
          note: note.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? '예약 중 오류가 발생했습니다.')
        return
      }

      onSuccess()
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const dayLabel = (d: Date) => {
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      day: days[d.getDay()],
      isToday: d.toDateString() === new Date().toDateString(),
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">상담 예약하기</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 교역자 선택 */}
        <section className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">교역자 선택</p>
          <div className="flex flex-wrap gap-2">
            {counselors.length === 0 && (
              <p className="text-sm text-gray-400">교역자 정보를 불러오는 중…</p>
            )}
            {counselors.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCounselor(c.id)}
                className={[
                  'px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap',
                  selectedCounselor === c.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                ].join(' ')}
              >
                {c.name}
                <span className="ml-1 text-xs opacity-70">
                  {c.role === 'pastor' ? '목사' : '선교회장'}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* 날짜 선택 */}
        <section className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">날짜 선택</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {DAYS.map((d) => {
              const { date, day, isToday } = dayLabel(d)
              const isSelected = d.toDateString() === selectedDay.toDateString()
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className={[
                    'flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl transition-colors min-w-[52px]',
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                  ].join(' ')}
                >
                  <span className="text-xs font-semibold whitespace-nowrap">{date}</span>
                  <span className={['text-xs mt-0.5', isToday && !isSelected ? 'text-indigo-500 font-bold' : ''].join(' ')}>
                    {isToday ? '오늘' : day}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* 시간 슬롯 */}
        <section className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">시간 선택</p>
          <div className="grid grid-cols-4 gap-1.5">
            {TIME_SLOTS.map((slot) => {
              const isBooked = bookedSlots.has(slot)
              const isSelected = selectedTime === slot
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={isBooked}
                  onClick={() => setSelectedTime(slot)}
                  className={[
                    'py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                    isBooked
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                      : isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-indigo-100',
                  ].join(' ')}
                >
                  {slot}
                </button>
              )
            })}
          </div>
        </section>

        {/* 상담 방법 */}
        <section className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">상담 방법</p>
          <div className="flex gap-2">
            {METHOD_OPTIONS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                className={[
                  'flex-1 flex flex-col items-center py-2.5 rounded-xl text-sm font-medium transition-colors gap-1',
                  method === m.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                ].join(' ')}
              >
                <span className="text-lg leading-none">{m.emoji}</span>
                <span className="text-xs whitespace-nowrap" style={{ wordBreak: 'keep-all' }}>
                  {m.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* 상담 시간 */}
        <section className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">상담 시간</p>
          <div className="flex gap-2">
            {([30, 60] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={[
                  'flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  duration === d ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                ].join(' ')}
              >
                {d}분
              </button>
            ))}
          </div>
        </section>

        {/* 사전 메모 */}
        <section className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            사전 메모 <span className="font-normal normal-case">(선택)</span>
          </p>
          <textarea
            placeholder="상담 전 미리 전달할 내용이 있으면 입력해주세요."
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 200))}
            rows={3}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
            style={{ wordBreak: 'keep-all' }}
          />
        </section>

        {error && (
          <p className="text-sm text-red-500 mb-3" style={{ wordBreak: 'keep-all' }}>{error}</p>
        )}

        {/* 버튼 */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleBook}
            disabled={submitting || !selectedCounselor || !selectedTime}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? '예약 중…' : '예약 신청'}
          </button>
        </div>
      </div>
    </div>
  )
}
