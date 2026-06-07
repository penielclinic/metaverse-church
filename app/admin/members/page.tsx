'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Member {
  id: string
  name: string
  phone: string | null
  role: string
  cellId: number | null
  cellName: string | null
  missionName: string | null
  createdAt: string | null
}

const ROLE_LABEL: Record<string, string> = {
  pastor:           '담임목사',
  associate_pastor: '부목사님',
  pastor_wife:      '목사님사모',
  school_pastor:    '교회학교 목사',
  elder:            '장로',
  mission_leader:   '선교회장',
  youth_pastor:     '청년부 교역자',
  youth_leader:     '청년회장',
  youth_vice_leader:'청년부회장',
  youth_secretary:  '청년부총무',
  school_teacher:   '교회학교 교사',
  cell_leader:      '순장',
  young_children:   '유년부',
  elementary:       '초등부',
  middle_school:    '중등부',
  high_school:      '고등부',
  youth:            '청년',
  member:           '성도',
}
const ROLE_COLOR: Record<string, string> = {
  pastor:           'bg-purple-100 text-purple-700',
  associate_pastor: 'bg-purple-100 text-purple-600',
  pastor_wife:      'bg-pink-100 text-pink-700',
  school_pastor:    'bg-blue-100 text-blue-700',
  elder:            'bg-yellow-100 text-yellow-700',
  mission_leader:   'bg-indigo-100 text-indigo-700',
  youth_pastor:     'bg-cyan-100 text-cyan-700',
  youth_leader:     'bg-orange-100 text-orange-700',
  youth_vice_leader:'bg-orange-100 text-orange-600',
  youth_secretary:  'bg-amber-100 text-amber-700',
  school_teacher:   'bg-teal-100 text-teal-700',
  cell_leader:      'bg-green-100 text-green-700',
  young_children:   'bg-sky-100 text-sky-700',
  elementary:       'bg-sky-100 text-sky-600',
  middle_school:    'bg-violet-100 text-violet-700',
  high_school:      'bg-violet-100 text-violet-600',
  youth:            'bg-gray-100 text-gray-600',
  member:           'bg-gray-100 text-gray-600',
}

const ALL_ROLES = Object.keys(ROLE_LABEL)

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 w-20 flex-shrink-0 whitespace-nowrap">{label}</span>
      <span className="text-sm text-gray-800" style={{ wordBreak: 'keep-all' }}>{value}</span>
    </div>
  )
}

export default function MembersPage() {
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [myRole, setMyRole] = useState('')
  const [cells, setCells] = useState<{ id: number; name: string }[]>([])

  // 상세 모달
  const [detail, setDetail] = useState<Member | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 편집 모달
  const [editing, setEditing] = useState<{
    id: string; name: string; phone: string; role: string; cellId: number | null
  } | null>(null)
  const [saving, setSaving] = useState(false)

  const loadMembers = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadError('로그인이 필요합니다.'); setLoading(false); return }

      const { data: myProfile } = await supabase
        .from('profiles').select('role, mission_id, cell_id').eq('id', user.id).single()

      const role = (myProfile?.role ?? 'member') as string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const myMissionId = (myProfile as any)?.mission_id ?? null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const myCellId    = (myProfile as any)?.cell_id ?? null
      setMyRole(role)

      const [{ data: cellsData }, { data: missionsData }] = await Promise.all([
        supabase.from('cells').select('id, name'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('missions').select('id, name'),
      ])
      const cellMap    = new Map<number, string>((cellsData ?? []).map((c: { id: number; name: string }) => [c.id, c.name]))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const missionMap = new Map<number, string>((missionsData ?? []).map((m: any) => [m.id as number, m.name as string]))
      setCells(cellsData ?? [])

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase
        .from('profiles')
        .select('id, name, phone, role, cell_id, mission_id, created_at')
        .order('name')

      if (role === 'cell_leader' || role === 'school_teacher') {
        q = q.eq('cell_id', myCellId)
      } else if (role === 'youth_pastor' || role === 'mission_leader') {
        q = q.eq('mission_id', myMissionId)
      } else if (role === 'school_pastor') {
        const { data: schoolMission } = await supabase.from('missions').select('id').eq('name', '교회학교').single()
        if (schoolMission) q = q.eq('mission_id', schoolMission.id)
      }

      const { data, error } = await q
      if (error) { setLoadError(`성도 조회 실패: ${error.message}`); setLoading(false); return }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setAllMembers((data ?? []).map((p: any) => ({
        id:          p.id,
        name:        p.name,
        phone:       p.phone ?? null,
        role:        p.role,
        cellId:      p.cell_id ?? null,
        cellName:    p.cell_id      ? (cellMap.get(p.cell_id)         ?? null) : null,
        missionName: p.mission_id   ? (missionMap.get(p.mission_id)   ?? null) : null,
        createdAt:   p.created_at ?? null,
      })))
    } catch (e) {
      setLoadError(`예기치 못한 오류: ${String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMembers() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const members = useMemo(() => {
    let list = allMembers
    if (search.trim())  list = list.filter(m => m.name.includes(search.trim()))
    if (roleFilter)     list = list.filter(m => m.role === roleFilter)
    return list
  }, [allMembers, search, roleFilter])

  // ── 수정 저장 ───────────────────────────────────────────
  const saveEdit = async () => {
    if (!editing) return
    setSaving(true)
    const res = await fetch('/api/admin/assign-member', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: editing.id,
        role:   editing.role,
        cellId: editing.cellId,
        name:   editing.name,
        phone:  editing.phone || null,
      }),
    })
    setSaving(false)
    if (!res.ok) { const j = await res.json(); alert(j.error ?? '저장 실패'); return }
    setEditing(null)
    setLoading(true)
    await loadMembers()
  }

  // ── 삭제 ────────────────────────────────────────────────
  const deleteMember = async () => {
    if (!detail) return
    setDeleting(true)
    const res = await fetch('/api/admin/delete-member', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: detail.id }),
    })
    setDeleting(false)
    if (!res.ok) { const j = await res.json(); alert(j.error ?? '삭제 실패'); return }
    setConfirmDelete(false)
    setDetail(null)
    setAllMembers(prev => prev.filter(m => m.id !== detail.id))
  }

  const canEdit   = myRole === 'pastor' || myRole === 'elder'
  const canDelete = myRole === 'pastor' || myRole === 'elder'

  const inputCls  = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300'
  const selectCls = `${inputCls} bg-white`

  return (
    <div className="px-4 py-6 max-w-screen-md mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">👤 성도 목록</h1>
        {!loading && !loadError && (
          <span className="text-sm text-gray-500">총 <strong className="text-gray-800">{members.length}</strong>명</span>
        )}
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600" style={{ wordBreak: 'keep-all' }}>
          {loadError}
        </div>
      )}

      {/* 필터 */}
      {!loadError && (
        <div className="flex flex-col gap-2 mb-4">
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="이름으로 검색..."
            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <select
            value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-600"
          >
            <option value="">전체 역할</option>
            {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 카드 목록 */}
      {!loading && !loadError && (
        <div className="space-y-3">
          {members.map((m) => (
            <button
              key={m.id} onClick={() => { setDetail(m); setConfirmDelete(false) }}
              className="w-full text-left bg-white rounded-2xl border border-gray-200 shadow-sm p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="font-bold text-gray-900 text-base whitespace-nowrap">{m.name}</span>
                  <span className={['text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', ROLE_COLOR[m.role] ?? 'bg-gray-100 text-gray-600'].join(' ')}>
                    {ROLE_LABEL[m.role] ?? m.role}
                  </span>
                </div>
                <span className="text-gray-300 flex-shrink-0 text-sm">›</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {m.cellName
                  ? <span className="text-xs text-indigo-600 whitespace-nowrap">{m.cellName}</span>
                  : <span className="text-xs text-gray-400 whitespace-nowrap">순 미배정</span>
                }
                {m.missionName && <span className="text-xs text-gray-400 whitespace-nowrap">· {m.missionName}</span>}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500 whitespace-nowrap">{m.phone ?? '연락처 없음'}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">가입 {formatDate(m.createdAt)}</span>
              </div>
            </button>
          ))}
          {members.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">성도가 없습니다.</div>}
        </div>
      )}

      {/* ── 상세 모달 ── */}
      {detail && !editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0"
          onClick={() => { setDetail(null); setConfirmDelete(false) }}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex flex-col gap-1.5">
                <p className="text-lg font-bold text-gray-900 whitespace-nowrap">{detail.name}</p>
                <span className={['text-[11px] font-semibold px-2.5 py-0.5 rounded-full self-start whitespace-nowrap', ROLE_COLOR[detail.role] ?? 'bg-gray-100 text-gray-600'].join(' ')}>
                  {ROLE_LABEL[detail.role] ?? detail.role}
                </span>
              </div>
              <button onClick={() => { setDetail(null); setConfirmDelete(false) }} className="text-gray-400 hover:text-gray-600 p-1 text-lg leading-none">✕</button>
            </div>

            <div className="mb-5">
              <InfoRow label="연락처" value={detail.phone ?? '—'} />
              <InfoRow label="소속 순" value={detail.cellName ?? '미배정'} />
              <InfoRow label="선교회" value={detail.missionName ?? '—'} />
              <InfoRow label="가입일" value={formatDate(detail.createdAt)} />
            </div>

            {/* 삭제 확인 */}
            {confirmDelete ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
                <p className="text-sm text-red-700 font-medium mb-3 text-center" style={{ wordBreak: 'keep-all' }}>
                  정말 <strong>{detail.name}</strong> 성도를 삭제하시겠습니까?<br />
                  <span className="text-xs font-normal">삭제 후 복구할 수 없습니다.</span>
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-600 min-h-[44px]">
                    취소
                  </button>
                  <button onClick={deleteMember} disabled={deleting}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50 min-h-[44px]">
                    {deleting ? '삭제 중...' : '삭제 확인'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                {canEdit && (
                  <button
                    onClick={() => setEditing({ id: detail.id, name: detail.name, phone: detail.phone ?? '', role: detail.role, cellId: detail.cellId })}
                    className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold min-h-[44px] hover:bg-indigo-700 transition-colors"
                  >
                    ✏️ 수정
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => setConfirmDelete(true)}
                    className="flex-1 py-3 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm font-semibold min-h-[44px] hover:bg-red-100 transition-colors">
                    🗑 삭제
                  </button>
                )}
                {!canEdit && !canDelete && (
                  <button onClick={() => { setDetail(null) }}
                    className="flex-1 py-3 rounded-xl border border-gray-300 text-sm text-gray-600 min-h-[44px]">
                    닫기
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 편집 모달 ── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5">
            <h2 className="text-base font-bold text-gray-800 mb-4">성도 정보 수정</h2>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">이름</label>
                <input type="text" value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">전화번호</label>
                <input type="tel" value={editing.phone}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  placeholder="010-0000-0000" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">역할</label>
                <select value={editing.role}
                  onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                  className={selectCls}>
                  {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">순/반 배정</label>
                <select value={editing.cellId ?? ''}
                  onChange={(e) => setEditing({ ...editing, cellId: e.target.value ? Number(e.target.value) : null })}
                  className={selectCls}>
                  <option value="">미배정</option>
                  {cells.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setEditing(null)}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-sm text-gray-600 min-h-[44px]">
                취소
              </button>
              <button onClick={saveEdit} disabled={saving}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 min-h-[44px]">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
