'use client'

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Subject { id: number; member_name: string; tags: string[]; assigned_elder: string | null; last_check?: { checked_at: string; status: string; method: string; note: string | null; elder_name: string } }

const STATUS_LABEL: Record<string, string> = { good: '양호', caution: '주의', urgent: '긴급' }
const STATUS_COLOR: Record<string, string> = { good: 'text-green-400', caution: 'text-yellow-400', urgent: 'text-red-400' }
const METHOD_LABEL: Record<string, string> = { phone: '전화', visit: '방문', message: '문자' }

export default function WellbeingCheck({ myUserId }: { myUserId: string }) {
  const supabase = createClient()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [tags, setTags] = useState('')
  const [checkForm, setCheckForm] = useState<{ subjectId: number; method: string; status: string; note: string } | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const s = supabase as any
    const { data } = await s.from('elder_care_subjects').select('*').order('created_at', { ascending: false })
    if (data) {
      const subs: Subject[] = []
      for (const sub of data as any[]) {
        const { data: checks } = await s.from('elder_wellbeing_checks').select('*').eq('subject_id', sub.id).order('checked_at', { ascending: false }).limit(1)
        let last = undefined
        if (checks?.length) {
          const c = checks[0]
          const { data: p } = await supabase.from('profiles').select('name').eq('id', c.elder_id).single()
          last = { checked_at: c.checked_at, status: c.status, method: c.method, note: c.note, elder_name: p?.name ?? '장로' }
        }
        subs.push({ ...sub, last_check: last })
      }
      setSubjects(subs)
    }
    setLoading(false)
  }

  async function addSubject() {
    if (!name.trim()) return
    await (supabase as any).from('elder_care_subjects').insert({
      member_name: name.trim(), tags: tags.split(',').map(t => t.trim()).filter(Boolean), assigned_elder: myUserId,
    })
    setName(''); setTags(''); setShowAdd(false); load()
  }

  async function submitCheck() {
    if (!checkForm) return
    await (supabase as any).from('elder_wellbeing_checks').insert({
      subject_id: checkForm.subjectId, elder_id: myUserId,
      checked_at: new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10),
      method: checkForm.method, status: checkForm.status, note: checkForm.note.trim() || null,
    })
    setCheckForm(null); load()
  }

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white">+ 대상 추가</button>
      </div>

      {showAdd && (
        <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="성도 이름"
            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 focus:outline-none" />
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="태그 (쉼표 구분: 독거, 고령, 환우)"
            className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 focus:outline-none" />
          <div className="flex gap-2">
            <button onClick={addSubject} className="flex-1 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold">등록</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-xs text-slate-400 border border-slate-600">취소</button>
          </div>
        </div>
      )}

      {subjects.length === 0 ? (
        <p className="text-center text-sm text-slate-500 py-8" style={{ wordBreak: 'keep-all' }}>등록된 돌봄 대상이 없습니다.</p>
      ) : subjects.map(s => (
        <div key={s.id} className="p-3 rounded-xl" style={{ background: 'rgba(30,27,75,0.6)', border: '1px solid rgba(251,191,36,0.15)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">❤️‍🩹</span>
            <p className="text-sm font-bold text-amber-100 whitespace-nowrap">{s.member_name}</p>
            {s.tags.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300 whitespace-nowrap">{t}</span>)}
          </div>
          {s.last_check ? (
            <div className="flex items-center gap-2 text-xs">
              <span className={STATUS_COLOR[s.last_check.status]}>{STATUS_LABEL[s.last_check.status]}</span>
              <span className="text-slate-500">· {METHOD_LABEL[s.last_check.method]} · {s.last_check.checked_at}</span>
              <span className="text-slate-500">· {s.last_check.elder_name}</span>
            </div>
          ) : (
            <p className="text-[10px] text-slate-500">아직 안부 체크 기록이 없습니다</p>
          )}
          {s.last_check?.note && <p className="text-xs text-slate-400 mt-1" style={{ wordBreak: 'keep-all' }}>{s.last_check.note}</p>}
          {checkForm?.subjectId === s.id ? (
            <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                {Object.entries(METHOD_LABEL).map(([k, v]) => (
                  <button key={k} onClick={() => setCheckForm({ ...checkForm, method: k })} className={`text-xs px-2.5 py-1 rounded-full ${checkForm.method === k ? 'bg-sky-500 text-white' : 'bg-slate-700 text-slate-300'}`}>{v}</button>
                ))}
              </div>
              <div className="flex gap-2">
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <button key={k} onClick={() => setCheckForm({ ...checkForm, status: k })} className={`text-xs px-2.5 py-1 rounded-full ${checkForm.status === k ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300'}`}>{v}</button>
                ))}
              </div>
              <textarea value={checkForm.note} onChange={e => setCheckForm({ ...checkForm, note: e.target.value })} placeholder="메모 (선택)" rows={2}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 resize-none focus:outline-none" />
              <div className="flex gap-2">
                <button onClick={submitCheck} className="flex-1 py-2 rounded-lg bg-sky-600 text-white text-xs font-bold">체크 완료</button>
                <button onClick={() => setCheckForm(null)} className="px-4 py-2 rounded-lg text-xs text-slate-400 border border-slate-600">취소</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setCheckForm({ subjectId: s.id, method: 'phone', status: 'good', note: '' })} className="mt-2 px-3 py-1 rounded-lg text-xs font-bold bg-sky-600 text-white">안부 체크</button>
          )}
        </div>
      ))}
    </div>
  )
}
