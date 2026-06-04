'use client'

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Req { id: number; requester: string | null; req_type: string; urgency: string; content: string; confidential: boolean; status: string; assigned_elder: string | null; assigned_name?: string; created_at: string }

const TYPE_LABEL: Record<string, string> = { visit: '심방', counsel: '상담', prayer: '기도', comfort: '위로' }
const URGENCY_LABEL: Record<string, string> = { low: '낮음', normal: '보통', high: '높음', urgent: '긴급' }
const URGENCY_COLOR: Record<string, string> = { low: 'bg-slate-600', normal: 'bg-blue-600', high: 'bg-orange-600', urgent: 'bg-red-600' }
const STATUS_LABEL: Record<string, string> = { received: '접수', assigned: '배정', in_progress: '진행 중', done: '완료' }

export default function CareRequests({ myUserId }: { myUserId: string }) {
  const supabase = createClient()
  const [reqs, setReqs] = useState<Req[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ requester: '', req_type: 'prayer', urgency: 'normal', content: '', confidential: false })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const s = supabase as any
    const { data } = await s.from('elder_care_requests').select('*').order('created_at', { ascending: false }).limit(30)
    if (data) {
      const mapped: Req[] = []
      for (const r of data as any[]) {
        let assigned_name: string | undefined
        if (r.assigned_elder) {
          const { data: p } = await supabase.from('profiles').select('name').eq('id', r.assigned_elder).single()
          assigned_name = p?.name ?? undefined
        }
        mapped.push({ ...r, assigned_name })
      }
      setReqs(mapped)
    }
    setLoading(false)
  }

  async function submit() {
    if (!form.content.trim()) return
    await (supabase as any).from('elder_care_requests').insert({
      requester: form.requester.trim() || null, req_type: form.req_type,
      urgency: form.urgency, content: form.content.trim(), confidential: form.confidential,
    })
    setForm({ requester: '', req_type: 'prayer', urgency: 'normal', content: '', confidential: false })
    setShowForm(false); load()
  }

  async function assign(reqId: number) {
    await (supabase as any).from('elder_care_requests').update({ assigned_elder: myUserId, status: 'assigned' }).eq('id', reqId)
    load()
  }

  async function updateStatus(reqId: number, status: string) {
    await (supabase as any).from('elder_care_requests').update({ status }).eq('id', reqId)
    load()
  }

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 text-white">+ 요청 접수</button>
      </div>

      {showForm && (
        <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <input value={form.requester} onChange={e => setForm({ ...form, requester: e.target.value })} placeholder="요청자 이름 (익명 가능)"
            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 focus:outline-none" />
          <div className="flex gap-2 flex-wrap">
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <button key={k} onClick={() => setForm({ ...form, req_type: k })} className={`text-xs px-2.5 py-1 rounded-full ${form.req_type === k ? 'bg-violet-500 text-white' : 'bg-slate-700 text-slate-300'}`}>{v}</button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(URGENCY_LABEL).map(([k, v]) => (
              <button key={k} onClick={() => setForm({ ...form, urgency: k })} className={`text-xs px-2.5 py-1 rounded-full ${form.urgency === k ? URGENCY_COLOR[k] + ' text-white' : 'bg-slate-700 text-slate-300'}`}>{v}</button>
            ))}
          </div>
          <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="돌봄 요청 내용" rows={3}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 resize-none focus:outline-none" />
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={form.confidential} onChange={e => setForm({ ...form, confidential: e.target.checked })} className="rounded" />
            비밀 보장 (담당자만 열람)
          </label>
          <div className="flex gap-2">
            <button onClick={submit} className="flex-1 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold">접수</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-xs text-slate-400 border border-slate-600">취소</button>
          </div>
        </div>
      )}

      {reqs.length === 0 ? (
        <p className="text-center text-sm text-slate-500 py-8" style={{ wordBreak: 'keep-all' }}>접수된 돌봄 요청이 없습니다.</p>
      ) : reqs.map(r => (
        <div key={r.id} className="p-3 rounded-xl" style={{ background: 'rgba(30,27,75,0.6)', border: '1px solid rgba(251,191,36,0.15)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white ${URGENCY_COLOR[r.urgency]}`}>{URGENCY_LABEL[r.urgency]}</span>
            <span className="text-xs text-slate-400">{TYPE_LABEL[r.req_type]}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${r.status === 'done' ? 'bg-green-600' : 'bg-slate-600'} text-white`}>{STATUS_LABEL[r.status]}</span>
          </div>
          <p className="text-sm text-slate-100 mt-1" style={{ wordBreak: 'keep-all' }}>{r.content}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-slate-500">{r.requester ?? '익명'} · {new Date(r.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', timeZone: 'Asia/Seoul' })}</span>
            {r.assigned_name && <span className="text-[10px] text-amber-400">담당: {r.assigned_name}</span>}
          </div>
          {r.status === 'received' && (
            <button onClick={() => assign(r.id)} className="mt-2 px-3 py-1 rounded-lg text-xs font-bold bg-violet-600 text-white">내가 담당</button>
          )}
          {r.assigned_elder === myUserId && r.status !== 'done' && (
            <div className="flex gap-2 mt-2">
              {r.status === 'assigned' && <button onClick={() => updateStatus(r.id, 'in_progress')} className="px-3 py-1 rounded-lg text-xs bg-blue-600 text-white">진행 시작</button>}
              <button onClick={() => updateStatus(r.id, 'done')} className="px-3 py-1 rounded-lg text-xs bg-green-600 text-white">완료</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
