'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Notice {
  id: number
  content: string
  is_active: boolean
  created_at: string
  created_by: string | null
}

export default function AdminNotices() {
  const supabase = createClient()
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [newContent, setNewContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [myUserId, setMyUserId] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setMyUserId(user.id)
      load()
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await (supabase as any)
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false })
    setNotices(data ?? [])
    setLoading(false)
  }

  async function create() {
    if (!newContent.trim()) return
    setSaving(true)
    await (supabase as any).from('notices').insert({
      content: newContent.trim(),
      created_by: myUserId,
      is_active: true,
    })
    setNewContent('')
    setSaving(false)
    load()
  }

  async function update(id: number) {
    if (!editContent.trim()) return
    setSaving(true)
    await (supabase as any).from('notices').update({ content: editContent.trim() }).eq('id', id)
    setEditId(null)
    setEditContent('')
    setSaving(false)
    load()
  }

  async function toggleActive(id: number, current: boolean) {
    await (supabase as any).from('notices').update({ is_active: !current }).eq('id', id)
    load()
  }

  async function remove(id: number) {
    if (!confirm('이 공지를 삭제하시겠습니까?')) return
    await (supabase as any).from('notices').delete().eq('id', id)
    load()
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h2 className="text-lg font-bold text-gray-800 mb-4">📢 공지사항 관리</h2>

      {/* 새 공지 작성 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
        <p className="text-sm font-semibold text-gray-700 mb-2">새 공지 작성</p>
        <textarea
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          placeholder="공지 내용을 입력하세요"
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-2"
        />
        <div className="flex justify-end">
          <button
            onClick={create}
            disabled={saving || !newContent.trim()}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-indigo-700 transition-colors"
          >
            {saving ? '저장 중...' : '등록'}
          </button>
        </div>
      </div>

      {/* 공지 목록 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notices.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">등록된 공지가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {notices.map(n => (
            <div key={n.id} className={`bg-white rounded-xl border p-4 shadow-sm ${n.is_active ? 'border-amber-200' : 'border-gray-200 opacity-60'}`}>
              {editId === n.id ? (
                /* 수정 모드 */
                <div>
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-2"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditId(null)} className="px-3 py-1.5 rounded-lg text-sm text-gray-500 border border-gray-200 hover:bg-gray-50">
                      취소
                    </button>
                    <button
                      onClick={() => update(n.id)}
                      disabled={saving || !editContent.trim()}
                      className="px-3 py-1.5 rounded-lg text-sm bg-indigo-600 text-white font-semibold disabled:opacity-50 hover:bg-indigo-700"
                    >
                      저장
                    </button>
                  </div>
                </div>
              ) : (
                /* 보기 모드 */
                <div>
                  <div className="flex items-start gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${n.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {n.is_active ? '게시 중' : '숨김'}
                    </span>
                    <p className="text-sm text-gray-800 flex-1 leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                      {n.content}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[11px] text-gray-400">
                      {new Date(n.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleActive(n.id, n.is_active)}
                        className={`text-xs px-2.5 py-1 rounded-lg border ${n.is_active ? 'border-gray-200 text-gray-500 hover:bg-gray-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                      >
                        {n.is_active ? '숨기기' : '게시'}
                      </button>
                      <button
                        onClick={() => { setEditId(n.id); setEditContent(n.content) }}
                        className="text-xs px-2.5 py-1 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => remove(n.id)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
