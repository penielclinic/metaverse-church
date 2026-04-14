'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
                              <div key={m.id} className="flex items-center justify-between">
                                <span className="text-sm text-gray-700 whitespace-nowrap">{m.name}</span>
                                {m.phone && (
                                  <a href={`tel:${m.phone}`} className="text-xs text-indigo-500 whitespace-nowrap">
                                    {m.phone}
                                  </a>
                                )}
                              </div>
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
    </div>
  )
}
