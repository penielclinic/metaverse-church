'use client'

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Req { id: number; req_type: string; detail: string; needed_by: string | null; max_helpers: number; status: string; created_at: string; requester_id: string; requester_name: string; volunteer_count: number; my_volunteered: boolean }

const TYPE_LABEL: Record<string, string> = { vehicle: '차량', moving: '이사', repair: '수리', financial: '재정 긴급', volunteer: '봉사 일손' }
const TYPE_EMOJI: Record<string, string> = { vehicle: '🚗', moving: '📦', repair: '🔧', financial: '💰', volunteer: '🤝' }
const STATUS_LABEL: Record<string, string> = { open: '모집 중', matched: '매칭 완료', done: '완료', cancelled: '취소' }

export default function HelpRequests({ myUserId }: { myUserId: string }) {
  const supabase = createClient()
  const [reqs, setReqs] = useState<Req[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ req_type: 'volunteer', detail: '', needed_by: '', max_helpers: 5 })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const s = supabase as any
    const { data } = await s.from('elder_help_requests').select('*').order('created_at', { ascending: false }).limit(20)
    if (data) {
      const mapped: Req[] = []
      for (const r of data as any[]) {
        const { count } = await s.from('elder_help_volunteers').select('id', { count: 'exact', head: true }).eq('request_id', r.id)
        const { data: my } = await s.from('elder_help_volunteers').select('id').eq('request_id', r.id).eq('elder_id', myUserId).limit(1)
        let requester_name = '익명'
        if (r.requester_id) {
          const { data: p } = await supabase.from('profiles').select('name').eq('id', r.requester_id).single()
          requester_name = p?.name ?? '성도'
        }
        mapped.push({ ...r, requester_name, volunteer_count: count ?? 0, my_volunteered: (my?.length ?? 0) > 0 })
      }
      setReqs(mapped)
    }
    setLoading(false)
  }

  async function submit() {
    if (!form.detail.trim()) return
    await (supabase as any).from('elder_help_requests').insert({
      requester_id: myUserId, req_type: form.req_type, detail: form.detail.trim(),
      needed_by: form.needed_by || null, max_helpers: form.max_helpers,
    })
    setForm({ req_type: 'volunteer', detail: '', needed_by: '', max_helpers: 5 })
    setShowForm(false); load()
  }

  async function volunteer(reqId: number) {
    await (supabase as any).from('elder_help_volunteers').upsert({ request_id: reqId, elder_id: myUserId }, { onConflict: 'request_id,elder_id' })
    load()
  }

  async function markDone(reqId: number) {
    await (supabase as any).from('elder_help_requests').update({ status: 'done' }).eq('id', reqId)
    load()
  }

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white">+ 도움 요청</button>
      </div>

      {showForm && (
        <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <button key={k} onClick={() => setForm({ ...form, req_type: k })} className={`text-xs px-2.5 py-1 rounded-full ${form.req_type === k ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'}`}>{TYPE_EMOJI[k]} {v}</button>
            ))}
          </div>
          <textarea value={form.detail} onChange={e => setForm({ ...form, detail: e.target.value })} placeholder="도움이 필요한 내용을 자세히 적어주세요" rows={3}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 resize-none focus:outline-none" />
          <input type="date" value={form.needed_by} onChange={e => setForm({ ...form, needed_by: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 focus:outline-none" />
          <div className="flex gap-2">
            <button onClick={submit} className="flex-1 py-2 rounded-lg bg-red-600 text-white text-xs font-bold">요청하기</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-xs text-slate-400 border border-slate-600">취소</button>
          </div>
        </div>
      )}

      {reqs.length === 0 ? (
        <p className="text-center text-sm text-slate-500 py-8" style={{ wordBreak: 'keep-all' }}>등록된 도움 요청이 없습니다.</p>
      ) : reqs.map(r => (
        <div key={r.id} className="p-3 rounded-xl" style={{ background: 'rgba(30,27,75,0.6)', border: '1px solid rgba(251,191,36,0.15)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{TYPE_EMOJI[r.req_type]}</span>
            <span className="text-xs font-bold text-amber-100">{TYPE_LABEL[r.req_type]}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white ${r.status === 'open' ? 'bg-green-600' : r.status === 'done' ? 'bg-slate-600' : 'bg-blue-600'}`}>{STATUS_LABEL[r.status]}</span>
          </div>
          <p className="text-sm text-slate-200 mt-1" style={{ wordBreak: 'keep-all' }}>{r.detail}</p>
          {r.needed_by && <p className="text-[10px] text-slate-400 mt-1">기한: {r.needed_by}</p>}
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-slate-500">{r.requester_name} · 자원 {r.volunteer_count}/{r.max_helpers}명</span>
            {r.status === 'open' && !r.my_volunteered && (
              <button onClick={() => volunteer(r.id)} className="px-3 py-1 rounded-lg text-xs font-bold bg-green-600 text-white">🤝 돕겠습니다</button>
            )}
            {r.my_volunteered && <span className="text-xs text-green-400 font-semibold">✅ 자원 완료</span>}
          </div>
          {r.requester_id === myUserId && r.status === 'open' && (
            <button onClick={() => markDone(r.id)} className="mt-2 px-3 py-1 rounded-lg text-xs bg-slate-600 text-white">완료 처리</button>
          )}
        </div>
      ))}
    </div>
  )
}
