'use client'

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Event { id: number; member_name: string; event_type: string; event_date: string; location: string | null; host: string | null; detail: string | null; status: string; attendee_count: number; my_attend: boolean }

const TYPE_LABEL: Record<string, string> = { wedding: '결혼', funeral: '소천', hospital: '입원', birth: '출산', birthday: '회갑/생일', other: '기타' }
const TYPE_EMOJI: Record<string, string> = { wedding: '💒', funeral: '🕊️', hospital: '🏥', birth: '👶', birthday: '🎂', other: '📋' }

export default function FamilyEvents({ myUserId }: { myUserId: string }) {
  const supabase = createClient()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ member_name: '', event_type: 'wedding', event_date: '', location: '', host: '', detail: '' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const s = supabase as any
    const { data } = await s.from('elder_family_events').select('*').order('event_date', { ascending: false }).limit(30)
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
      created_by: myUserId,
    })
    setForm({ member_name: '', event_type: 'wedding', event_date: '', location: '', host: '', detail: '' })
    setShowForm(false); load()
  }

  async function attend(eventId: number) {
    await (supabase as any).from('elder_event_attendees').upsert({ event_id: eventId, elder_id: myUserId, role: 'attend' }, { onConflict: 'event_id,elder_id' })
    load()
  }

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
          <div className="flex gap-2">
            <button onClick={submit} className="flex-1 py-2 rounded-lg bg-pink-600 text-white text-xs font-bold">등록</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-xs text-slate-400 border border-slate-600">취소</button>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <p className="text-center text-sm text-slate-500 py-8" style={{ wordBreak: 'keep-all' }}>등록된 경조사가 없습니다.</p>
      ) : events.map(e => (
        <div key={e.id} className="p-3 rounded-xl" style={{ background: 'rgba(30,27,75,0.6)', border: '1px solid rgba(251,191,36,0.15)' }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{TYPE_EMOJI[e.event_type]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-100 whitespace-nowrap">{e.member_name} — {TYPE_LABEL[e.event_type]}</p>
              <p className="text-[10px] text-slate-400">{e.event_date} {e.location ? `· ${e.location}` : ''}</p>
            </div>
          </div>
          {e.host && <p className="text-xs text-slate-400 mt-1">상주/혼주: {e.host}</p>}
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-slate-500">참석 장로 {e.attendee_count}명</span>
            {e.my_attend ? (
              <span className="text-xs text-green-400 font-semibold">✅ 참석 완료</span>
            ) : (
              <button onClick={() => attend(e.id)} className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white">참석</button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
