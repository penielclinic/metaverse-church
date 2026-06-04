'use client'

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Target { id: number; title: string; category: string; is_active: boolean }
interface Log { id: number; target_id: number; elder_id: string; prayed_at: string; status: string; testimony: string | null; elder_name?: string }

const CATEGORY_LABEL: Record<string, string> = { pastor: '담임목사', church: '교회 비전', sick: '환우', nation: '나라', general: '일반' }
const CATEGORY_EMOJI: Record<string, string> = { pastor: '⛪', church: '🌟', sick: '🏥', nation: '🇰🇷', general: '📌' }

export default function PrayerRelay({ myUserId }: { myUserId: string }) {
  const supabase = createClient()
  const [targets, setTargets] = useState<Target[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('general')
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null)
  const [testimony, setTestimony] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const s = supabase as any
    const { data: t } = await s.from('elder_prayer_targets').select('*').eq('is_active', true).order('created_at', { ascending: false })
    setTargets(t ?? [])

    const { data: l } = await s.from('elder_prayer_logs').select('*').order('prayed_at', { ascending: false }).limit(50)
    if (l) {
      const uids = Array.from(new Set<string>(l.map((x: any) => x.elder_id)))
      const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', uids.length ? uids : ['__'])
      const nameMap: Record<string, string> = {}
      profiles?.forEach((p: any) => { nameMap[p.id] = p.name })
      setLogs(l.map((x: any) => ({ ...x, elder_name: nameMap[x.elder_id] ?? '장로' })))
    }
    setLoading(false)
  }

  async function addTarget() {
    if (!title.trim()) return
    await (supabase as any).from('elder_prayer_targets').insert({ title: title.trim(), category })
    setTitle(''); setShowAdd(false); load()
  }

  async function pray(targetId: number) {
    const today = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10)
    await (supabase as any).from('elder_prayer_logs').insert({
      target_id: targetId, elder_id: myUserId, prayed_at: today,
      testimony: testimony.trim() || null, status: testimony.trim() ? 'answered' : 'ongoing',
    })
    setTestimony(''); setSelectedTarget(null); load()
  }

  const today = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10)
  const todayLogs = logs.filter(l => l.prayed_at === today)
  const streak = new Set(logs.map(l => l.prayed_at)).size

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">오늘 기도한 장로 <span className="text-amber-400 font-bold">{todayLogs.length}명</span></p>
          <p className="text-xs text-orange-400 mt-0.5">🔥 {streak}일 이어달리기 중</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white">+ 대상 추가</button>
      </div>

      {showAdd && (
        <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="중보 대상 제목" className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 focus:outline-none" />
          <div className="flex gap-2 flex-wrap">
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <button key={k} onClick={() => setCategory(k)} className={`text-xs px-2.5 py-1 rounded-full ${category === k ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300'}`}>{v}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={addTarget} className="flex-1 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold">등록</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-xs text-slate-400 border border-slate-600">취소</button>
          </div>
        </div>
      )}

      {targets.map(t => {
        const targetLogs = todayLogs.filter(l => l.target_id === t.id)
        const myPrayed = targetLogs.some(l => l.elder_id === myUserId)
        return (
          <div key={t.id} className="p-3 rounded-xl" style={{ background: 'rgba(30,27,75,0.6)', border: '1px solid rgba(251,191,36,0.15)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{CATEGORY_EMOJI[t.category] ?? '📌'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-100" style={{ wordBreak: 'keep-all' }}>{t.title}</p>
                <p className="text-[10px] text-slate-500">{CATEGORY_LABEL[t.category]} · 오늘 {targetLogs.length}명 기도</p>
              </div>
              {myPrayed ? (
                <span className="text-xs text-green-400 font-semibold whitespace-nowrap">✅ 완료</span>
              ) : selectedTarget === t.id ? null : (
                <button onClick={() => setSelectedTarget(t.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 text-white whitespace-nowrap">🙏 기도</button>
              )}
            </div>
            {selectedTarget === t.id && (
              <div className="mt-2 space-y-2">
                <textarea value={testimony} onChange={e => setTestimony(e.target.value)} placeholder="간증이 있다면 남겨주세요 (선택)" rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 resize-none focus:outline-none" />
                <div className="flex gap-2">
                  <button onClick={() => pray(t.id)} className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold">기도 완료</button>
                  <button onClick={() => setSelectedTarget(null)} className="px-4 py-2 rounded-lg text-xs text-slate-400 border border-slate-600">취소</button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {logs.filter(l => l.testimony).length > 0 && (
        <div>
          <p className="text-xs text-amber-400 font-bold mb-2">✨ 응답 간증</p>
          {logs.filter(l => l.testimony).slice(0, 5).map(l => (
            <div key={l.id} className="mb-2 p-2 rounded-lg" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
              <p className="text-xs text-green-300" style={{ wordBreak: 'keep-all' }}>{l.testimony}</p>
              <p className="text-[10px] text-slate-500 mt-1">{l.elder_name} · {l.prayed_at}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
