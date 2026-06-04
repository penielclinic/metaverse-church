'use client'

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Reco { id: number; kind: string; title: string; author: string | null; link: string | null; category: string; comment: string | null; rating: number | null; elder_name: string; elder_id: string; mark_count: number; my_marked: boolean }

const KIND_LABEL: Record<string, string> = { book: '도서', sermon: '설교' }
const CAT_LABEL: Record<string, string> = { faith: '신앙', leadership: '리더십', pastoral: '목회', family: '가정' }

export default function Recommendations({ myUserId }: { myUserId: string }) {
  const supabase = createClient()
  const [items, setItems] = useState<Reco[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ kind: 'book', title: '', author: '', link: '', category: 'faith', comment: '', rating: 5 })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const s = supabase as any
    const { data } = await s.from('elder_recommendations').select('*').order('created_at', { ascending: false }).limit(30)
    if (data) {
      const uids = Array.from(new Set<string>((data as any[]).map(x => x.elder_id)))
      const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', uids.length ? uids : ['__'])
      const nameMap: Record<string, string> = {}
      profiles?.forEach((p: any) => { nameMap[p.id] = p.name })

      const mapped: Reco[] = []
      for (const r of data as any[]) {
        const { count } = await s.from('elder_reco_marks').select('id', { count: 'exact', head: true }).eq('reco_id', r.id)
        const { data: my } = await s.from('elder_reco_marks').select('id').eq('reco_id', r.id).eq('elder_id', myUserId).limit(1)
        mapped.push({ ...r, elder_name: nameMap[r.elder_id] ?? '장로', mark_count: count ?? 0, my_marked: (my?.length ?? 0) > 0 })
      }
      setItems(mapped)
    }
    setLoading(false)
  }

  async function submit() {
    if (!form.title.trim()) return
    await (supabase as any).from('elder_recommendations').insert({
      elder_id: myUserId, kind: form.kind, title: form.title.trim(),
      author: form.author.trim() || null, link: form.link.trim() || null,
      category: form.category, comment: form.comment.trim() || null, rating: form.rating,
    })
    setForm({ kind: 'book', title: '', author: '', link: '', category: 'faith', comment: '', rating: 5 })
    setShowForm(false); load()
  }

  async function mark(recoId: number) {
    await (supabase as any).from('elder_reco_marks').upsert({ reco_id: recoId, elder_id: myUserId }, { onConflict: 'reco_id,elder_id' })
    load()
  }

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 text-white">+ 추천하기</button>
      </div>

      {showForm && (
        <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <div className="flex gap-2">
            {Object.entries(KIND_LABEL).map(([k, v]) => (
              <button key={k} onClick={() => setForm({ ...form, kind: k })} className={`text-xs px-3 py-1 rounded-full ${form.kind === k ? 'bg-teal-500 text-white' : 'bg-slate-700 text-slate-300'}`}>{k === 'book' ? '📚' : '🎤'} {v}</button>
            ))}
          </div>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="제목"
            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 focus:outline-none" />
          <input value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} placeholder="저자/설교자 (선택)"
            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 focus:outline-none" />
          <input value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="링크 (선택)"
            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 focus:outline-none" />
          <div className="flex gap-2 flex-wrap">
            {Object.entries(CAT_LABEL).map(([k, v]) => (
              <button key={k} onClick={() => setForm({ ...form, category: k })} className={`text-xs px-2.5 py-1 rounded-full ${form.category === k ? 'bg-teal-500 text-white' : 'bg-slate-700 text-slate-300'}`}>{v}</button>
            ))}
          </div>
          <textarea value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} placeholder="한 줄 추천평 (선택)" rows={2}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 resize-none focus:outline-none" />
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-400 mr-1">별점</span>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setForm({ ...form, rating: n })} className="text-lg">{n <= form.rating ? '⭐' : '☆'}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={submit} className="flex-1 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold">등록</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-xs text-slate-400 border border-slate-600">취소</button>
          </div>
        </div>
      )}

      {items.map(r => (
        <div key={r.id} className="p-3 rounded-xl" style={{ background: 'rgba(30,27,75,0.5)', border: '1px solid rgba(251,191,36,0.1)' }}>
          <div className="flex items-start gap-2">
            <span className="text-lg mt-0.5">{r.kind === 'book' ? '📚' : '🎤'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-100" style={{ wordBreak: 'keep-all' }}>{r.title}</p>
              {r.author && <p className="text-xs text-slate-400">{r.author}</p>}
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-amber-400">{'⭐'.repeat(r.rating ?? 0)}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300">{CAT_LABEL[r.category]}</span>
              </div>
            </div>
          </div>
          {r.comment && <p className="text-xs text-slate-300 mt-2" style={{ wordBreak: 'keep-all' }}>{r.comment}</p>}
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-slate-500">{r.elder_name}</span>
            <button onClick={() => mark(r.id)} className={`text-xs px-2.5 py-1 rounded-full font-semibold ${r.my_marked ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-700 text-slate-300'}`}>
              {r.my_marked ? '✅ 읽음' : '📖 나도 읽음'} {r.mark_count > 0 && `(${r.mark_count})`}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
