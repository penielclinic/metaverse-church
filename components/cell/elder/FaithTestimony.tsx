'use client'

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Testimony {
  id: number
  elder_id: string
  elder_name: string
  title: string
  content: string
  category: string
  created_at: string
  amen_count: number
  my_amen: boolean
}

const CAT_LABEL: Record<string, string> = { healing: '치유', answer: '응답', growth: '성장', grace: '은혜', gratitude: '감사', other: '기타' }
const CAT_EMOJI: Record<string, string> = { healing: '💊', answer: '🙌', growth: '🌱', grace: '✝️', gratitude: '🙏', other: '📝' }

export default function FaithTestimony({ myUserId }: { myUserId: string }) {
  const supabase = createClient()
  const [items, setItems] = useState<Testimony[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', category: 'grace' })
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const s = supabase as any
    const { data } = await s.from('elder_testimonies').select('*').order('created_at', { ascending: false }).limit(30)
    if (data) {
      const uids = Array.from(new Set<string>((data as any[]).map((x: any) => x.elder_id)))
      const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', uids.length ? uids : ['__'])
      const nameMap: Record<string, string> = {}
      profiles?.forEach((p: any) => { nameMap[p.id] = p.name })

      const mapped: Testimony[] = []
      for (const t of data as any[]) {
        const { count } = await s.from('elder_testimony_amens').select('id', { count: 'exact', head: true }).eq('testimony_id', t.id)
        const { data: my } = await s.from('elder_testimony_amens').select('id').eq('testimony_id', t.id).eq('elder_id', myUserId).limit(1)
        mapped.push({
          ...t,
          elder_name: nameMap[t.elder_id] ?? '장로',
          amen_count: count ?? 0,
          my_amen: (my?.length ?? 0) > 0,
        })
      }
      setItems(mapped)
    }
    setLoading(false)
  }

  async function submit() {
    if (!form.title.trim() || !form.content.trim()) return
    await (supabase as any).from('elder_testimonies').insert({
      elder_id: myUserId,
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category,
    })
    setForm({ title: '', content: '', category: 'grace' })
    setShowForm(false)
    load()
  }

  async function amen(id: number) {
    await (supabase as any).from('elder_testimony_amens').upsert(
      { testimony_id: id, elder_id: myUserId },
      { onConflict: 'testimony_id,elder_id' }
    )
    load()
  }

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 text-white">+ 간증 나누기</button>
      </div>

      {showForm && (
        <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(CAT_LABEL).map(([k, v]) => (
              <button key={k} onClick={() => setForm({ ...form, category: k })}
                className={`text-xs px-2.5 py-1 rounded-full ${form.category === k ? 'bg-violet-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                {CAT_EMOJI[k]} {v}
              </button>
            ))}
          </div>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="간증 제목"
            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 focus:outline-none" />
          <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="하나님의 은혜를 나눠주세요..." rows={4}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 resize-none focus:outline-none" />
          <div className="flex gap-2">
            <button onClick={submit} className="flex-1 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold">등록</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-xs text-slate-400 border border-slate-600">취소</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-center text-sm text-slate-500 py-8" style={{ wordBreak: 'keep-all' }}>아직 간증이 없습니다. 첫 번째 간증을 나눠보세요!</p>
      ) : items.map(t => (
        <div key={t.id} className="p-3 rounded-xl" style={{ background: 'rgba(30,27,75,0.6)', border: '1px solid rgba(251,191,36,0.15)' }}>
          <div className="flex items-start gap-2">
            <span className="text-lg mt-0.5">{CAT_EMOJI[t.category] ?? '📝'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-100" style={{ wordBreak: 'keep-all' }}>{t.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300">{CAT_LABEL[t.category]}</span>
                <span className="text-[10px] text-slate-500">{t.elder_name}</span>
                <span className="text-[10px] text-slate-500">{t.created_at?.slice(0, 10)}</span>
              </div>
            </div>
          </div>
          {expanded === t.id ? (
            <div className="mt-2">
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap" style={{ wordBreak: 'keep-all' }}>{t.content}</p>
              <button onClick={() => setExpanded(null)} className="text-[10px] text-slate-500 mt-1">접기 ▲</button>
            </div>
          ) : (
            <button onClick={() => setExpanded(t.id)} className="mt-1 text-[10px] text-sky-400">전문 보기 ▼</button>
          )}
          <div className="flex items-center justify-end mt-2">
            <button onClick={() => amen(t.id)}
              className={`text-xs px-3 py-1 rounded-full font-semibold ${t.my_amen ? 'bg-violet-500/20 text-violet-300' : 'bg-slate-700 text-slate-300'}`}>
              🙏 아멘 {t.amen_count > 0 && `(${t.amen_count})`}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
