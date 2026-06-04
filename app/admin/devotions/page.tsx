'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DevotionRow {
  id: number
  logged_date: string
  bible_ref: string | null
  content: string | null
  is_public: boolean
  created_at: string
  user_name: string
}

export default function AdminDevotionsPage() {
  const supabase = createClient()
  const [rows, setRows] = useState<DevotionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  })
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  async function loadData() {
    setLoading(true)
    try {
      // devotion_logs 조회 (해당 날짜)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: logs, error } = await (supabase as any)
        .from('devotion_logs')
        .select('id, user_id, logged_date, bible_ref, content, is_public, created_at')
        .eq('logged_date', selectedDate)
        .order('created_at', { ascending: false })

      if (error || !logs) { setRows([]); setLoading(false); return }

      // 유저 이름 조회
      const userIds = Array.from(new Set<string>(logs.map((l: { user_id: string }) => l.user_id)))
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds.length ? userIds : ['__none__'])

      const nameMap: Record<string, string> = {}
      profiles?.forEach((p: { id: string; name: string }) => { nameMap[p.id] = p.name })

      const mapped: DevotionRow[] = logs.map((l: { id: number; user_id: string; logged_date: string; bible_ref: string | null; content: string | null; is_public: boolean; created_at: string }) => ({
        id: l.id,
        logged_date: l.logged_date,
        bible_ref: l.bible_ref,
        content: l.content,
        is_public: l.is_public,
        created_at: l.created_at,
        user_name: nameMap[l.user_id] ?? '(알 수 없음)',
      }))

      setRows(mapped)
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
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
      <h1 className="text-xl font-bold text-gray-800 mb-4">📖 말씀 인증 (큐티)</h1>

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
              {/* 헤더 (클릭으로 펼치기) */}
              <button
                onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
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
                  {row.content ? (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                      {row.content}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">묵상 내용이 없습니다.</p>
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
