'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DevotionRow {
  id: number
  logged_date: string
  bible_ref: string | null
  content: string | null
  is_public: boolean
  created_at: string
  user_id: string
  user_name: string
}

export default function AdminDevotionsPage() {
  const supabase = createClient()
  const [rows, setRows] = useState<DevotionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10)
  })
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [myUserId, setMyUserId] = useState('')

  // 말씀 등록 폼
  const [showForm, setShowForm] = useState(false)
  const [formRef, setFormRef] = useState('')
  const [formContent, setFormContent] = useState('')
  const [saving, setSaving] = useState(false)

  // 수정 모드
  const [editId, setEditId] = useState<number | null>(null)
  const [editRef, setEditRef] = useState('')
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setMyUserId(user.id)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  async function loadData() {
    setLoading(true)
    try {
      const { data: logs, error } = await (supabase as any)
        .from('devotion_logs')
        .select('id, user_id, logged_date, bible_ref, content, is_public, created_at')
        .eq('logged_date', selectedDate)
        .order('created_at', { ascending: false })

      if (error || !logs) { setRows([]); setLoading(false); return }

      const userIds = Array.from(new Set<string>(logs.map((l: any) => l.user_id)))
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds.length ? userIds : ['__none__'])

      const nameMap: Record<string, string> = {}
      profiles?.forEach((p: any) => { nameMap[p.id] = p.name })

      const mapped: DevotionRow[] = logs.map((l: any) => ({
        id: l.id,
        logged_date: l.logged_date,
        bible_ref: l.bible_ref,
        content: l.content,
        is_public: l.is_public,
        created_at: l.created_at,
        user_id: l.user_id,
        user_name: nameMap[l.user_id] ?? '(알 수 없음)',
      }))

      setRows(mapped)
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  async function submitDevotion() {
    if (!formRef.trim() || !formContent.trim()) return
    setSaving(true)
    const today = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10)
    await (supabase as any).from('devotion_logs').insert({
      user_id: myUserId,
      logged_date: today,
      bible_ref: formRef.trim(),
      content: formContent.trim(),
      is_public: true,
    })
    setFormRef('')
    setFormContent('')
    setShowForm(false)
    setSaving(false)
    setSelectedDate(today)
    loadData()
  }

  async function updateDevotion(id: number) {
    if (!editContent.trim()) return
    setSaving(true)
    await (supabase as any).from('devotion_logs').update({
      bible_ref: editRef.trim() || null,
      content: editContent.trim(),
    }).eq('id', id)
    setEditId(null)
    setSaving(false)
    loadData()
  }

  async function deleteDevotion(id: number) {
    if (!confirm('이 말씀 인증을 삭제하시겠습니까?')) return
    await (supabase as any).from('devotion_logs').delete().eq('id', id)
    loadData()
  }

  const changeDate = (delta: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  const dateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })

  return (
    <div className="px-4 py-6 max-w-screen-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">📖 말씀 인증 (큐티)</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          + 말씀 등록
        </button>
      </div>

      {/* 말씀 등록 폼 */}
      {showForm && (
        <div className="bg-white border border-indigo-200 rounded-2xl p-4 mb-4 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-indigo-700">✏️ 새 말씀 등록</p>
          <p className="text-xs text-gray-400" style={{ wordBreak: 'keep-all' }}>
            여기서 등록한 말씀은 예배란(본당)의 &quot;말씀 묵상 나눔&quot;에 바로 표시되며, 모든 성도가 보고 댓글을 달 수 있습니다.
          </p>
          <input
            value={formRef}
            onChange={e => setFormRef(e.target.value)}
            placeholder="말씀 구절 (예: 요한복음 3:16)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <textarea
            value={formContent}
            onChange={e => setFormContent(e.target.value)}
            placeholder="묵상 내용을 작성하세요"
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg text-sm text-gray-500 border border-gray-200 hover:bg-gray-50">
              취소
            </button>
            <button
              onClick={submitDevotion}
              disabled={saving || !formRef.trim() || !formContent.trim()}
              className="px-4 py-1.5 rounded-lg text-sm bg-indigo-600 text-white font-semibold disabled:opacity-50 hover:bg-indigo-700"
            >
              {saving ? '저장 중...' : '등록'}
            </button>
          </div>
        </div>
      )}

      {/* 날짜 선택 */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <button onClick={() => changeDate(-1)} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold">
          ←
        </button>
        <div className="text-center">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <p className="text-xs text-gray-400 mt-1">{dateLabel}</p>
        </div>
        <button onClick={() => changeDate(1)} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold">
          →
        </button>
      </div>

      {/* 통계 */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-4 text-center">
        <p className="text-2xl font-black text-indigo-600">{rows.length}</p>
        <p className="text-xs text-indigo-500 font-semibold">이 날 인증한 성도 수</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">📭</p>
          <p className="text-sm" style={{ wordBreak: 'keep-all' }}>이 날 큐티 인증 기록이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
            >
              {/* 헤더 */}
              <button
                onClick={() => { setExpandedId(expandedId === row.id ? null : row.id); setEditId(null) }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl">📖</span>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-bold text-gray-800 whitespace-nowrap">{row.user_name}</p>
                    <p className="text-xs text-gray-400 whitespace-nowrap">
                      {row.bible_ref || '(말씀 구절 없음)'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!row.is_public && (
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full whitespace-nowrap">비공개</span>
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(row.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-gray-400 text-xs">{expandedId === row.id ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* 펼친 내용 */}
              {expandedId === row.id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  {editId === row.id ? (
                    <div className="space-y-2">
                      <input
                        value={editRef}
                        onChange={e => setEditRef(e.target.value)}
                        placeholder="말씀 구절"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        rows={4}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditId(null)} className="px-3 py-1.5 rounded-lg text-sm text-gray-500 border border-gray-200 hover:bg-gray-50">
                          취소
                        </button>
                        <button
                          onClick={() => updateDevotion(row.id)}
                          disabled={saving || !editContent.trim()}
                          className="px-3 py-1.5 rounded-lg text-sm bg-indigo-600 text-white font-semibold disabled:opacity-50 hover:bg-indigo-700"
                        >
                          저장
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {row.content ? (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                          {row.content}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">묵상 내용이 없습니다.</p>
                      )}
                      <div className="flex gap-2 justify-end mt-3">
                        <button
                          onClick={() => { setEditId(row.id); setEditRef(row.bible_ref ?? ''); setEditContent(row.content ?? '') }}
                          className="text-xs px-2.5 py-1 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => deleteDevotion(row.id)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                        >
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
