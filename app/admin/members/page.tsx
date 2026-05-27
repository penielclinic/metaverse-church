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
  createdAt: string | null
  lastSignInAt: string | null
}

const ROLE_LABEL: Record<string, string> = {
  pastor: '담임목사', school_pastor: '교회학교 목사', mission_leader: '선교회장',
  youth_pastor: '청년부 교역자', school_teacher: '교회학교 교사',
  youth_leader: '청년회장', youth_vice_leader: '청년부회장', youth_secretary: '청년부총무',
  cell_leader: '순장', youth: '청년', member: '성도', elder: '장로',
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
  elder: 'bg-yellow-100 text-yellow-700',
}

const ALL_ROLES = Object.keys(ROLE_LABEL)

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}일 전`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}개월 전`
  return `${Math.floor(months / 12)}년 전`
}

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
  const supabase = createClient()
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState('')
  const [editing, setEditing] = useState<{ id: string; role: string; cellId: number | null } | null>(null)
  const [detail, setDetail] = useState<Member | null>(null)
  const [cells, setCells] = useState<{ id: number; name: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      setMyRole(profile?.role ?? 'member')
      const { data: allCells } = await supabase.from('cells').select('id, name').order('id')
      setCells(allCells ?? [])
      setInitialized(true)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (roleFilter) params.set('role', roleFilter)

    const res = await fetch(`/api/admin/members?${params}`)
    if (!res.ok) { setLoading(false); return }
    const { members: data } = await res.json()
    setMembers(data ?? [])
    setLoading(false)
  }, [search, roleFilter])

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
    setDetail(null)
    load()
  }

  const canEditRole = myRole === 'pastor'

  return (
    <div className="px-4 py-6 max-w-screen-md mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">👤 성도 목록</h1>
        {!loading && (
          <span className="text-sm text-gray-500">
            총 <strong className="text-gray-800">{members.length}</strong>명
          </span>
        )}
      </div>

      {/* 필터 */}
      <div className="flex flex-col gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름으로 검색..."
          className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-600"
        >
          <option value="">전체 역할</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </select>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 카드 목록 */}
      {!loading && (
        <div className="space-y-3">
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setDetail(m)}
              className="w-full text-left bg-white rounded-2xl border border-gray-200 shadow-sm p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              {/* 이름 + 역할 뱃지 */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="font-bold text-gray-900 text-base whitespace-nowrap">{m.name}</span>
                  <span className={['text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', ROLE_COLOR[m.role] ?? 'bg-gray-100 text-gray-600'].join(' ')}>
                    {ROLE_LABEL[m.role] ?? m.role}
                  </span>
                </div>
                <span className="text-gray-300 flex-shrink-0 text-sm">›</span>
              </div>

              {/* 소속 정보 */}
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {m.cellName
                  ? <span className="text-xs text-indigo-600 whitespace-nowrap">{m.cellName}</span>
                  : <span className="text-xs text-gray-400 whitespace-nowrap">순 미배정</span>
                }
                {m.missionName && (
                  <span className="text-xs text-gray-400 whitespace-nowrap">· {m.missionName}</span>
                )}
              </div>

              {/* 연락처 + 마지막 로그인 */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {m.phone ?? '연락처 없음'}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">
                    최근 접속
                  </span>
                  <span className="text-[10px] font-medium text-indigo-500 whitespace-nowrap">
                    {timeAgo(m.lastSignInAt)}
                  </span>
                </div>
              </div>
            </button>
          ))}
          {members.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">성도가 없습니다.</div>
          )}
        </div>
      )}

      {/* 성도 상세 모달 */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0"
          onClick={() => setDetail(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex flex-col gap-1.5">
                <p className="text-lg font-bold text-gray-900 whitespace-nowrap">{detail.name}</p>
                <span className={['text-[11px] font-semibold px-2.5 py-0.5 rounded-full self-start whitespace-nowrap', ROLE_COLOR[detail.role] ?? 'bg-gray-100 text-gray-600'].join(' ')}>
                  {ROLE_LABEL[detail.role] ?? detail.role}
                </span>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 p-1 text-lg leading-none">✕</button>
            </div>

            <div className="mb-5">
              <InfoRow label="연락처" value={detail.phone ?? '—'} />
              <InfoRow label="소속 순" value={detail.cellName ?? '미배정'} />
              <InfoRow label="선교회" value={detail.missionName ?? '—'} />
              <InfoRow label="최근 접속" value={timeAgo(detail.lastSignInAt)} />
              <InfoRow label="가입일" value={formatDate(detail.createdAt)} />
            </div>

            <div className="flex gap-2">
              {canEditRole && (
                <button
                  onClick={() => {
                    setDetail(null)
                    setEditing({ id: detail.id, role: detail.role, cellId: detail.cellId })
                  }}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold min-h-[44px] hover:bg-indigo-700 transition-colors"
                >
                  역할·순 편집
                </button>
              )}
              <button
                onClick={() => setDetail(null)}
                className={['py-3 rounded-xl border border-gray-300 text-sm text-gray-600 min-h-[44px] hover:bg-gray-50 transition-colors', canEditRole ? 'px-5' : 'flex-1'].join(' ')}
              >
                닫기
              </button>
            </div>
          </div>
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
