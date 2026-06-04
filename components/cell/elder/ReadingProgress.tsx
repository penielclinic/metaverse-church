'use client'

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Entry { id: number; elder_id: string; read_date: string; passage: string; reflection: string | null; elder_name?: string }

export default function ReadingProgress({ myUserId }: { myUserId: string }) {
  const supabase = createClient()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [passage, setPassage] = useState('')
  const [reflection, setReflection] = useState('')
  const [todayDone, setTodayDone] = useState(false)

  const today = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const s = supabase as any
    const { data } = await s.from('elder_reading_progress').select('*').order('read_date', { ascending: false }).limit(30)
    if (data) {
      const uids = Array.from(new Set<string>(data.map((x: any) => x.elder_id)))
      const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', uids.length ? uids : ['__'])
      const nameMap: Record<string, string> = {}
      profiles?.forEach((p: any) => { nameMap[p.id] = p.name })
      const mapped = data.map((x: any) => ({ ...x, elder_name: nameMap[x.elder_id] ?? '장로' }))
      setEntries(mapped)
      setTodayDone(mapped.some((e: Entry) => e.elder_id === myUserId && e.read_date === today))
    }
    setLoading(false)
  }

  async function submit() {
    if (!passage.trim()) return
    await (supabase as any).from('elder_reading_progress').upsert({
      elder_id: myUserId, read_date: today, passage: passage.trim(),
      reflection: reflection.trim() || null,
    }, { onConflict: 'elder_id,read_date' })
    setPassage(''); setReflection(''); setShowForm(false); load()
  }

  const myCount = entries.filter(e => e.elder_id === myUserId).length
  const todayEntries = entries.filter(e => e.read_date === today)

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">오늘 통독 완료 <span className="text-amber-400 font-bold">{todayEntries.length}명</span></p>
          <p className="text-xs text-green-400 mt-0.5">내 진도: {myCount}일 완료</p>
        </div>
        {!todayDone && (
          <button onClick={() => setShowForm(true)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600 text-white">📖 오늘 인증</button>
        )}
      </div>

      {todayDone && (
        <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
          <p className="text-sm font-bold text-green-400">✅ 오늘 통독 완료!</p>
        </div>
      )}

      {showForm && (
        <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <input value={passage} onChange={e => setPassage(e.target.value)} placeholder="오늘 읽은 본문 (예: 창세기 1-3장)"
            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 focus:outline-none" />
          <textarea value={reflection} onChange={e => setReflection(e.target.value)} placeholder="묵상 한 줄 (선택)" rows={2}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 resize-none focus:outline-none" />
          <div className="flex gap-2">
            <button onClick={submit} className="flex-1 py-2 rounded-lg bg-green-600 text-white text-xs font-bold">인증하기</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-xs text-slate-400 border border-slate-600">취소</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {entries.slice(0, 15).map(e => (
          <div key={e.id} className="p-2.5 rounded-lg" style={{ background: 'rgba(30,27,75,0.5)', border: '1px solid rgba(251,191,36,0.1)' }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-amber-100 whitespace-nowrap">{e.elder_name}</p>
              <p className="text-[10px] text-slate-500">{e.read_date}</p>
            </div>
            <p className="text-xs text-sky-300 mt-1">📖 {e.passage}</p>
            {e.reflection && <p className="text-xs text-slate-300 mt-1" style={{ wordBreak: 'keep-all' }}>{e.reflection}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
