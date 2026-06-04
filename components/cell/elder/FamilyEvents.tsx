'use client'

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Event { id: number; member_name: string; event_type: string; event_date: string; location: string | null; host: string | null; detail: string | null; memo: string | null; status: string; attendee_count: number; my_attend: boolean }

const TYPE_LABEL: Record<string, string> = { wedding: '결혼', funeral: '소천', hospital: '입원', birth: '출산', birthday: '회갑/생일', other: '기타' }
const TYPE_EMOJI: Record<string, string> = { wedding: '💒', funeral: '🕊️', hospital: '🏥', birth: '👶', birthday: '🎂', other: '📋' }

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

function getCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const days: (number | null)[] = []
  for (let i = 0; i < first.getDay(); i++) days.push(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(d)
  return days
}

export default function FamilyEvents({ myUserId }: { myUserId: string }) {
  const supabase = createClient()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ member_name: '', event_type: 'wedding', event_date: '', location: '', host: '', detail: '', memo: '' })

  const now = new Date(Date.now() + 9 * 3_600_000)
  const [calYear, setCalYear] = useState(now.getUTCFullYear())
  const [calMonth, setCalMonth] = useState(now.getUTCMonth())
  const todayStr = now.toISOString().slice(0, 10)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const s = supabase as any
    const { data } = await s.from('elder_family_events').select('*').order('event_date', { ascending: false }).limit(50)
    if (data) {
      const evts: Event[] = []
      for (const e of data as any[]) {
        const { count } = await s.from('elder_event_attendees').select('id', { count: 'exact', head: true }).eq('event_id', e.id)
        const { data: myA } = await s.from('elder_event_attendees').select('id').eq('event_id', e.id).eq('elder_id', myUserId).limit(1)
        evts.push({ ...e, attendee_count: count ?? 0, my_attend: (myA?.length ?? 0) > 0 })
      }
      setEvents(evts)
    }
    setLoading(false)
  }

  async function submit() {
    if (!form.member_name.trim() || !form.event_date) return
    await (supabase as any).from('elder_family_events').insert({
      member_name: form.member_name.trim(), event_type: form.event_type, event_date: form.event_date,
      location: form.location.trim() || null, host: form.host.trim() || null, detail: form.detail.trim() || null,
      memo: form.memo.trim() || null, created_by: myUserId,
    })
    setForm({ member_name: '', event_type: 'wedding', event_date: '', location: '', host: '', detail: '', memo: '' })
    setShowForm(false); load()
  }

  async function attend(eventId: number) {
    await (supabase as any).from('elder_event_attendees').upsert({ event_id: eventId, elder_id: myUserId, role: 'attend' }, { onConflict: 'event_id,elder_id' })
    load()
  }

  // 달력에 표시할 이벤트 맵
  const calDays = getCalendarDays(calYear, calMonth)
  const monthStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`
  const monthEvents = events.filter(e => e.event_date.startsWith(monthStr))
  const eventsByDay: Record<number, Event[]> = {}
  monthEvents.forEach(e => {
    const d = parseInt(e.event_date.slice(8, 10), 10)
    if (!eventsByDay[d]) eventsByDay[d] = []
    eventsByDay[d].push(e)
  })

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : []

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-pink-600 text-white">+ 경조사 등록</button>
      </div>

      {showForm && (
        <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <input value={form.member_name} onChange={e => setForm({ ...form, member_name: e.target.value })} placeholder="대상자 이름"
            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 focus:outline-none" />
          <div className="flex gap-2 flex-wrap">
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <button key={k} onClick={() => setForm({ ...form, event_type: k })} className={`text-xs px-2.5 py-1 rounded-full ${form.event_type === k ? 'bg-pink-500 text-white' : 'bg-slate-700 text-slate-300'}`}>{TYPE_EMOJI[k]} {v}</button>
            ))}
          </div>
          <input type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 focus:outline-none" />
          <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="장소 (선택)"
            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 focus:outline-none" />
          <input value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} placeholder="상주/혼주 (선택)"
            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 focus:outline-none" />
          <textarea value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} placeholder="메모 (선택)" rows={2}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 resize-none focus:outline-none" />
          <div className="flex gap-2">
            <button onClick={submit} className="flex-1 py-2 rounded-lg bg-pink-600 text-white text-xs font-bold">등록</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-xs text-slate-400 border border-slate-600">취소</button>
          </div>
        </div>
      )}

      {/* 달력 */}
      <div className="rounded-xl p-3" style={{ background: 'rgba(30,27,75,0.6)', border: '1px solid rgba(251,191,36,0.15)' }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="text-slate-400 px-2 py-1 text-sm">◀</button>
          <p className="text-sm font-bold text-amber-200">{calYear}년 {calMonth + 1}월</p>
          <button onClick={nextMonth} className="text-slate-400 px-2 py-1 text-sm">▶</button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
          {WEEKDAY.map((w, i) => (
            <span key={w} className={`text-[10px] font-bold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-500'}`}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {calDays.map((d, i) => {
            if (d === null) return <div key={`e${i}`} />
            const dayStr = `${monthStr}-${String(d).padStart(2, '0')}`
            const hasEvent = !!eventsByDay[d]
            const isToday = dayStr === todayStr
            const isSelected = d === selectedDay
            return (
              <button key={i} onClick={() => setSelectedDay(isSelected ? null : d)}
                className={`relative rounded-md py-1.5 text-xs transition-all ${isToday ? 'ring-1 ring-amber-400' : ''} ${isSelected ? 'bg-pink-600/40 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}>
                {d}
                {hasEvent && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {eventsByDay[d].slice(0, 3).map((ev, j) => (
                      <span key={j} className="w-1 h-1 rounded-full" style={{ background: ev.event_type === 'funeral' ? '#94a3b8' : '#f472b6' }} />
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 선택된 날짜 이벤트 */}
      {selectedDay !== null && (
        <div className="space-y-2">
          <p className="text-xs text-amber-300 font-bold">{calMonth + 1}월 {selectedDay}일 경조사</p>
          {selectedEvents.length === 0 ? (
            <p className="text-xs text-slate-500">해당 날짜에 경조사가 없습니다.</p>
          ) : selectedEvents.map(e => (
            <EventCard key={e.id} e={e} onAttend={attend} />
          ))}
        </div>
      )}

      {/* 전체 목록 (최근) */}
      <div>
        <p className="text-xs text-slate-500 mb-2">전체 경조사 ({events.length}건)</p>
        {events.length === 0 ? (
          <p className="text-center text-sm text-slate-500 py-4" style={{ wordBreak: 'keep-all' }}>등록된 경조사가 없습니다.</p>
        ) : events.map(e => (
          <div key={e.id} className="mb-2">
            <EventCard e={e} onAttend={attend} />
          </div>
        ))}
      </div>
    </div>
  )
}

function EventCard({ e, onAttend }: { e: Event; onAttend: (id: number) => void }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: 'rgba(30,27,75,0.6)', border: '1px solid rgba(251,191,36,0.15)' }}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{TYPE_EMOJI[e.event_type]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-100 whitespace-nowrap">{e.member_name} — {TYPE_LABEL[e.event_type]}</p>
          <p className="text-[10px] text-slate-400">{e.event_date} {e.location ? `· ${e.location}` : ''}</p>
        </div>
      </div>
      {e.host && <p className="text-xs text-slate-400 mt-1">상주/혼주: {e.host}</p>}
      {e.memo && (
        <div className="mt-1.5 p-2 rounded-lg" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.12)' }}>
          <p className="text-xs text-amber-200" style={{ wordBreak: 'keep-all' }}>📝 {e.memo}</p>
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-slate-500">참석 장로 {e.attendee_count}명</span>
        {e.my_attend ? (
          <span className="text-xs text-green-400 font-semibold">✅ 참석 완료</span>
        ) : (
          <button onClick={() => onAttend(e.id)} className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white">참석</button>
        )}
      </div>
    </div>
  )
}
