'use client'

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Ann { id: number; title: string; body: string; level: string; pinned: boolean; created_at: string; author_name: string; read_count: number; my_read: boolean; total_elders: number }

const LEVEL_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  normal:    { bg: 'bg-slate-600', text: 'text-slate-300', label: '일반' },
  important: { bg: 'bg-amber-600', text: 'text-amber-300', label: '중요' },
  urgent:    { bg: 'bg-red-600',   text: 'text-red-300',   label: '긴급' },
}

export default function ElderAnnouncements({ myUserId }: { myUserId: string }) {
  const supabase = createClient()
  const [items, setItems] = useState<Ann[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', level: 'normal', pinned: false })
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const s = supabase as any
    const { data } = await s.from('elder_announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(20)
    if (data) {
      const uids = Array.from(new Set<string>((data as any[]).map(x => x.author_id)))
      const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', uids.length ? uids : ['__'])
      const nameMap: Record<string, string> = {}
      profiles?.forEach((p: any) => { nameMap[p.id] = p.name })

      const mapped: Ann[] = []
      for (const a of data as any[]) {
        const { count: readCount } = await s.from('elder_announcement_reads').select('id', { count: 'exact', head: true }).eq('announcement_id', a.id)
        const { data: myR } = await s.from('elder_announcement_reads').select('id').eq('announcement_id', a.id).eq('elder_id', myUserId).limit(1)
        mapped.push({
          id: a.id, title: a.title, body: a.body, level: a.level, pinned: a.pinned,
          created_at: a.created_at, author_name: nameMap[a.author_id] ?? '관리자',
          read_count: readCount ?? 0, my_read: (myR?.length ?? 0) > 0, total_elders: 0,
        })
      }
      setItems(mapped)
    }
    setLoading(false)
  }

  async function submit() {
    if (!form.title.trim() || !form.body.trim()) return
    await (supabase as any).from('elder_announcements').insert({
      author_id: myUserId, title: form.title.trim(), body: form.body.trim(),
      level: form.level, pinned: form.pinned,
    })
    setForm({ title: '', body: '', level: 'normal', pinned: false })
    setShowForm(false); load()
  }

  async function markRead(annId: number) {
    await (supabase as any).from('elder_announcement_reads').upsert({ announcement_id: annId, elder_id: myUserId }, { onConflict: 'announcement_id,elder_id' })
    load()
  }

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-600 text-white">+ 공지 작성</button>
      </div>

      {showForm && (
        <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="공지 제목"
            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 focus:outline-none" />
          <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="공지 내용" rows={4}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 resize-none focus:outline-none" />
          <div className="flex gap-2 flex-wrap">
            {Object.entries(LEVEL_STYLE).map(([k, v]) => (
              <button key={k} onClick={() => setForm({ ...form, level: k })} className={`text-xs px-2.5 py-1 rounded-full ${form.level === k ? v.bg + ' text-white' : 'bg-slate-700 text-slate-300'}`}>{v.label}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={form.pinned} onChange={e => setForm({ ...form, pinned: e.target.checked })} className="rounded" />
            상단 고정
          </label>
          <div className="flex gap-2">
            <button onClick={submit} className="flex-1 py-2 rounded-lg bg-orange-600 text-white text-xs font-bold">게시</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-xs text-slate-400 border border-slate-600">취소</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-center text-sm text-slate-500 py-8" style={{ wordBreak: 'keep-all' }}>등록된 공지가 없습니다.</p>
      ) : items.map(a => (
        <div key={a.id} className="rounded-xl overflow-hidden" style={{ background: 'rgba(30,27,75,0.6)', border: `1px solid ${a.level === 'urgent' ? 'rgba(239,68,68,0.4)' : a.level === 'important' ? 'rgba(251,191,36,0.3)' : 'rgba(251,191,36,0.1)'}` }}>
          <button onClick={() => { setExpanded(expanded === a.id ? null : a.id); if (!a.my_read) markRead(a.id) }}
            className="w-full px-3 py-3 flex items-center gap-2 hover:bg-white/5 transition-colors text-left">
            {a.pinned && <span className="text-xs">📌</span>}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white ${LEVEL_STYLE[a.level].bg}`}>{LEVEL_STYLE[a.level].label}</span>
            <p className="flex-1 text-sm font-bold text-amber-100 truncate">{a.title}</p>
            {!a.my_read && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
            <span className="text-[10px] text-slate-500 whitespace-nowrap">읽음 {a.read_count}</span>
            <span className="text-xs text-slate-500">{expanded === a.id ? '▲' : '▼'}</span>
          </button>
          {expanded === a.id && (
            <div className="px-3 pb-3 border-t border-white/5 pt-2">
              <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed" style={{ wordBreak: 'keep-all' }}>{a.body}</p>
              <p className="text-[10px] text-slate-500 mt-2">{a.author_name} · {new Date(a.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', timeZone: 'Asia/Seoul' })}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
