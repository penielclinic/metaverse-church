'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Member {
  id: string
  name: string
  phone: string | null
  role: string
  cellId: number | null
  cellName: string | null
  missionName: string | null
}

const ROLE_LABEL: Record<string, string> = {
  pastor: '담임목사', school_pastor: '교회학교 목사', mission_leader: '선교회장',
  youth_pastor: '청년부 교역자', school_teacher: '교회학교 교사',
  youth_leader: '청년회장', youth_vice_leader: '청년부회장', youth_secretary: '청년부총무',
  cell_leader: '순장', youth: '청년', member: '성도',
}
const ROLE_COLOR: Record<string, string> = {
  pastor: 'bg-purple-100 text-purple-700',
  school_pastor: 'bg-blue-100 text-blue-700',
  mission_leader: 'bg-indigo-100 text-indigo-700',
  youth_pastor: 'bg-cyan-100 text-cyan-700',
  school_teacher: 'bg-teal-100 text-teal-700',
  youth_leader: 'bg-orange-100 text-orange-700',
  youth_vice_leader: 'bg-orange-100 text-orange-600',
  youth_secretary: 'bg-amber-100 text-amber-700',
  cell_leader: 'bg-green-100 text-green-700',
  youth: 'bg-gray-100 text-gray-600',
  member: 'bg-gray-100 text-gray-600',
}

const ALL_ROLES = Object.keys(ROLE_LABEL)

export default function MembersPage() {
  const supabase = createClient()
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState('')
  const [myMissionId, setMyMissionId] = useState<number | null>(null)
  const [myCellId, setMyCellId] = useState<number | null>(null)
  const [editing, setEditing] = useState<{ id: string; role: string; cellId: number | null } | null>(null)
  const [cells, setCells] = useState<{ id: number; name: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: profile } = await supabase
        .from('profiles').select('role, mission_id, cell_id').eq('id', user.id).single()
      setMyRole(profile?.role ?? 'member')
      setMyMissionId(profile?.mission_id ?? null)
      setMyCellId(profile?.cell_id ?? null)

      const { data: allCells } = await supabase.from('cells').select('id, name').order('id')
      setCells(allCells ?? [])
      setInitialized(true)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from('profiles')
      .select(`id, name, phone, role, cell_id, cells ( name ), missions ( name )`)
      .order('name')

    // 역할별 조회 범위 제한
    if (myRole === 'cell_leader' || myRole === 'school_teacher') {
      q = q.eq('cell_id', myCellId)
    } else if (myRole === 'youth_pastor' || myRole === 'mission_leader') {
      q = q.eq('mission_id', myMissionId)
    } else if (myRole === 'school_pastor') {
      const { data: m } = await supabase.from('missions').select('id').eq('name', '교회학교').single()
      q = q.eq('mission_id', m?.id)
    }
    // pastor: 전체 조회 (필터 없음)

    if (search.trim()) q = q.ilike('name', `%${search.trim()}%`)

    const { data } = await q
    setMembers(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data ?? []).map((m: any) => ({
        id: m.id,
        name: m.name,
        phone: m.phone,
        role: m.role,
        cellId: m.cell_id ?? null,
        cellName: m.cells?.name ?? null,
        missionName: m.missions?.name ?? null,
      }))
    )
    setLoading(false)
  }, [myRole, myMissionId, myCellId, search, supabase])

  useEffect(() => {
    if (initialized) load()
  }, [initialized, load])

  const saveEdit = async () => {
    if (!editing) return
    setSaving(true)
    const res = await fetch('/api/admin/assign-member', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: editing.id, role: editing.role, cellId: editing.cellId }),
    })
    setSaving(false)
    if (!res.ok) {
      const { error } = await res.json()
      alert(error ?? '저장 실패')
      return
    }
    setEditing(null)
    load()
  }

  // 역할 변경 권한: pastor만
  const canEditRole = myRole === 'pastor'

  return (
    <div className="px-4 py-6 max-w-screen-md mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-4">👤 성도 목록</h1>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="이름 검색..."
          className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <button
          onClick={() => load()}
          className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          검색
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 mb-2">총 {members.length}명</p>
          {members.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-800 text-sm whitespace-nowrap">{m.name}</span>
                    <span className={['text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', ROLE_COLOR[m.role] ?? 'bg-gray-100 text-gray-600'].join(' ')}>
                      {ROLE_LABEL[m.role] ?? m.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {m.cellName && <span className="text-xs text-indigo-600 whitespace-nowrap">{m.cellName}</span>}
                    {m.missionName && <span className="text-xs text-gray-400 whitespace-nowrap">· {m.missionName}</span>}
                    {!m.cellName && <span className="text-xs text-gray-400 whitespace-nowrap">순 미배정</span>}
                  </div>
                </div>
                {canEditRole && (
                  <button
                    onClick={() => setEditing({ id: m.id, role: m.role, cellId: m.cellId })}
                    className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    편집
                  </button>
                )}
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">검색 결과가 없습니다.</div>
          )}
        </div>
      )}

      {/* 역할 편집 모달 (pastor 전용) */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5">
            <h2 className="text-base font-bold text-gray-800 mb-4">역할 · 순 변경</h2>

            <label className="block text-xs font-semibold text-gray-600 mb-1">역할</label>
            <select
              value={editing.role}
              onChange={(e) => setEditing({ ...editing, role: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>

            <label className="block text-xs font-semibold text-gray-600 mb-1">순/반 배정</label>
            <select
              value={editing.cellId ?? ''}
              onChange={(e) => setEditing({ ...editing, cellId: e.target.value ? Number(e.target.value) : null })}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">미배정</option>
              {cells.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="flex-1 py-3 rounded-xl border border-gray-300 text-sm text-gray-600 min-h-[44px]">취소</button>
              <button onClick={saveEdit} disabled={saving} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 min-h-[44px]">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
