'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AvatarPreview from '@/components/world/AvatarPreview'
import type { SkinTone, Gender, Outfit } from '@/components/world/AvatarPreview'

interface MemberProfile {
  id: string
  name: string
  phone: string | null
  role: string
  titles: string[]
  cellName: string | null
  skinTone: string
  gender: string
  hairStyle: string
  outfit: string
}

const ROLE_LABEL: Record<string, string> = {
  pastor: '담임목사', school_pastor: '교회학교 목사', mission_leader: '선교회장',
  youth_pastor: '청년부 교역자', school_teacher: '교회학교 교사',
  youth_leader: '청년회장', youth_vice_leader: '청년부회장', youth_secretary: '청년부총무',
  cell_leader: '순장', youth: '청년', member: '성도',
}

interface CellDetail {
  id: number
  name: string
  missionName: string | null
  leaderName: string | null
  memberCount: number
  pendingCount: number
}

export default function CellsPage() {
  const supabase = createClient()
  const [cells, setCells] = useState<CellDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [cellMembers, setCellMembers] = useState<{ id: string; name: string; phone: string | null }[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles').select('role, mission_id, cell_id').eq('id', user.id).single()
      const role = (profile?.role ?? '') as string

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase
        .from('cells')
        .select(`
          id, name,
          missions ( name ),
          leader:profiles!cells_leader_id_fkey ( name ),
          members:profiles!profiles_cell_id_fkey ( id ),
          requests:cell_join_requests ( id )
        `)
        .order('id')

      if (role === 'cell_leader' || role === 'school_teacher') {
        q = q.eq('id', profile?.cell_id)
      } else if (role === 'youth_pastor' || role === 'mission_leader') {
        q = q.eq('mission_id', profile?.mission_id)
      } else if (role === 'school_pastor') {
        const { data: m } = await supabase.from('missions').select('id').eq('name', '교회학교').single()
        q = q.eq('mission_id', m?.id)
      }

      const { data } = await q

      // pending 신청 수는 별도 조회
      const { data: pending } = await supabase
        .from('cell_join_requests').select('cell_id').eq('status', 'pending')

      const pendingMap: Record<number, number> = {}
      ;(pending ?? []).forEach((p: { cell_id: number }) => {
        pendingMap[p.cell_id] = (pendingMap[p.cell_id] ?? 0) + 1
      })

      setCells(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data ?? []).map((c: any) => ({
          id: c.id,
          name: c.name,
          missionName: c.missions?.name ?? null,
          leaderName: c.leader?.name ?? null,
          memberCount: Array.isArray(c.members) ? c.members.length : 0,
          pendingCount: pendingMap[c.id] ?? 0,
        }))
      )
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openMemberProfile = async (memberId: string) => {
    setLoadingProfile(true)
    const { data: p } = await supabase
      .from('profiles')
      .select('id, name, phone, role, titles, cell_id, cells!profiles_cell_id_fkey(name)')
      .eq('id', memberId)
      .single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: av } = await (supabase.from('avatars') as any)
      .select('skin_tone, gender, hair_style, outfit')
      .eq('user_id', memberId)
      .single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = p as any
    setSelectedMember({
      id: memberId,
      name: profile?.name ?? '',
      phone: profile?.phone ?? null,
      role: profile?.role ?? 'member',
      titles: Array.isArray(profile?.titles) ? profile.titles : [],
      cellName: profile?.cells?.name ?? null,
      skinTone: av?.skin_tone ?? 'medium',
      gender: av?.gender ?? 'male',
      hairStyle: av?.hair_style ?? 'short',
      outfit: av?.outfit ?? 'casual',
    })
    setLoadingProfile(false)
  }

  const toggleExpand = async (cellId: number) => {
    if (expanded === cellId) { setExpanded(null); return }
    setExpanded(cellId)
    setLoadingMembers(true)
    const { data } = await supabase
      .from('profiles').select('id, name, phone').eq('cell_id', cellId).order('name')
    setCellMembers(data ?? [])
    setLoadingMembers(false)
  }

  // 선교회별 그룹핑
  const groups: Record<string, CellDetail[]> = {}
  cells.forEach((c) => {
    const key = c.missionName ?? '기타'
    if (!groups[key]) groups[key] = []
    groups[key].push(c)
  })

  return (
    <div className="px-4 py-6 max-w-screen-md mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-4">👥 순/반 목록</h1>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          {Object.entries(groups).map(([groupName, groupCells]) => (
            <div key={groupName}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-sm font-bold text-gray-700 whitespace-nowrap">{groupName}</span>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 whitespace-nowrap">{groupCells.length}개</span>
              </div>

              <div className="space-y-2">
                {groupCells.map((cell) => (
                  <div key={cell.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <button
                      onClick={() => toggleExpand(cell.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-800 text-sm whitespace-nowrap">{cell.name}</span>
                          {cell.pendingCount > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 whitespace-nowrap">
                              신청 {cell.pendingCount}건
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            순장 {cell.leaderName ?? '미정'}
                          </span>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            · {cell.memberCount}명
                          </span>
                        </div>
                      </div>
                      <span className={['text-gray-400 text-sm transition-transform', expanded === cell.id ? 'rotate-180' : ''].join(' ')}>
                        ▾
                      </span>
                    </button>

                    {/* 펼쳐지는 멤버 목록 */}
                    {expanded === cell.id && (
                      <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                        {loadingMembers ? (
                          <div className="flex justify-center py-4">
                            <div className="w-6 h-6 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : cellMembers.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-2">배정된 성도가 없습니다.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {cellMembers.map((m) => (
                              <button
                                key={m.id}
                                onClick={() => openMemberProfile(m.id)}
                                className="w-full flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-indigo-50 transition-colors text-left"
                              >
                                <span className="text-sm text-gray-700 whitespace-nowrap font-medium">{m.name}</span>
                                <span className="text-xs text-indigo-400 whitespace-nowrap">상세 보기 →</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* 순원 프로필 모달 */}
      {(selectedMember || loadingProfile) && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0"
          onClick={() => setSelectedMember(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {loadingProfile ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedMember && (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 overflow-hidden flex-shrink-0">
                    <AvatarPreview
                      skinTone={selectedMember.skinTone as SkinTone}
                      gender={selectedMember.gender as Gender}
                      hairStyle={selectedMember.hairStyle}
                      outfit={selectedMember.outfit as Outfit}
                      size={64}
                      faceOnly
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 text-base whitespace-nowrap">{selectedMember.name}</p>
                    <p className="text-xs text-indigo-600 mt-0.5 whitespace-nowrap">
                      {ROLE_LABEL[selectedMember.role] ?? selectedMember.role}
                    </p>
                    {selectedMember.cellName && (
                      <p className="text-xs text-gray-400 whitespace-nowrap">{selectedMember.cellName}</p>
                    )}
                  </div>
                </div>

                {selectedMember.titles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {selectedMember.titles.map((t) => (
                      <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium whitespace-nowrap">
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {selectedMember.phone && (
                  <a
                    href={`tel:${selectedMember.phone}`}
                    className="flex items-center gap-2 w-full py-3 px-4 rounded-xl bg-green-50 text-green-700 text-sm font-semibold mb-2 hover:bg-green-100 transition-colors"
                  >
                    <span>📞</span>
                    <span className="whitespace-nowrap">{selectedMember.phone}</span>
                  </a>
                )}

                <button
                  onClick={() => setSelectedMember(null)}
                  className="w-full py-2.5 rounded-xl border border-gray-300 text-sm text-gray-600"
                >
                  닫기
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
