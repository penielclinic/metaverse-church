'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useWorldStore } from '@/store/worldStore'

// 이름에 '전체방'이 포함된 셀은 같은 선교회 소속이면 누구나 입장 가능
const OPEN_ROOM_KEYWORD = '전체방'

interface Cell {
  id: number
  name: string
  leaderName: string
  memberCount: number
  missionName: string | null
  missionId: number | null
}

export default function CellPage() {
  const router = useRouter()
  const { setCurrentSpace } = useWorldStore()
  const supabase = createClient()

  const [cells, setCells] = useState<Cell[]>([])
  const [myProfile, setMyProfile] = useState<{ cell_id: number | null; role: string; mission_id: number | null } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      // 현재 사용자 프로필
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('cell_id, role, mission_id')
          .eq('id', user.id)
          .single()
        setMyProfile(profile ?? null)
      }

      // 셀 목록 + 순장 이름 + 선교회명 + 인원 수
      const { data: cellRows } = await supabase
        .from('cells')
        .select(`
          id, name, mission_id,
          leader:profiles!cells_leader_id_fkey ( name ),
          missions ( name ),
          members:profiles!profiles_cell_id_fkey ( id )
        `)
        .order('id')

      if (cellRows) {
        setCells(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cellRows.map((c: any) => ({
            id: c.id,
            name: c.name,
            leaderName: c.leader?.name ?? '미정',
            memberCount: Array.isArray(c.members) ? c.members.length : 0,
            missionName: c.missions?.name ?? null,
            missionId: c.mission_id ?? null,
          }))
        )
      }

      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canEnter = (cell: Cell) => {
    if (!myProfile) return false
    if (myProfile.role === 'pastor' || myProfile.role === 'youth_pastor') return true
    // 전체방: 같은 선교회 소속이면 입장 가능
    if (cell.name.includes(OPEN_ROOM_KEYWORD)) {
      return myProfile.mission_id === cell.missionId
    }
    return myProfile.cell_id === cell.id
  }

  const handleEnter = (cell: Cell) => {
    setCurrentSpace(`cell-${cell.id}`, `${cell.name} 모임방`)
    router.push(`/world/cell/${cell.id}`)
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gradient-to-b from-indigo-50 to-purple-50 px-4 py-6">
      <div className="max-w-screen-md mx-auto">

        {/* 헤더 */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">👥 소그룹</h1>
          <p className="mt-1 text-sm text-gray-500" style={{ wordBreak: 'keep-all' }}>
            내 순 모임방에 입장해 셀원들과 교제하세요
          </p>
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* 셀 없음 */}
        {!loading && cells.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center gap-3">
            <span className="text-5xl">🏗️</span>
            <p className="text-gray-500 text-sm" style={{ wordBreak: 'keep-all' }}>
              아직 등록된 순이 없습니다.<br />담당자에게 문의해 주세요.
            </p>
          </div>
        )}

        {/* 셀 목록 — 선교회별 그룹 */}
        {!loading && cells.length > 0 && (() => {
          // 선교회명으로 그룹핑
          const groups: Record<string, Cell[]> = {}
          cells.forEach((cell) => {
            const key = cell.missionName ?? '기타'
            if (!groups[key]) groups[key] = []
            groups[key].push(cell)
          })
          const GROUP_EMOJI: Record<string, string> = {
            '청년회': '🙌',
            '교회학교': '📚',
            '기타': '👥',
          }
          return (
            <div className="space-y-6">
              {Object.entries(groups).map(([groupName, groupCells]) => (
                <div key={groupName}>
                  {/* 섹션 헤더 */}
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className="text-base">{GROUP_EMOJI[groupName] ?? '👥'}</span>
                    <span className="text-sm font-bold text-gray-700 whitespace-nowrap">{groupName}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  <div className="space-y-2">
                    {groupCells.map((cell) => {
                      const mine = myProfile?.cell_id === cell.id
                      const isOpen = cell.name.includes(OPEN_ROOM_KEYWORD)
                      const enter = canEnter(cell)
                      return (
                        <div
                          key={cell.id}
                          className={[
                            'flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border-2 shadow-sm transition-all',
                            mine ? 'border-indigo-400' :
                            isOpen ? 'border-purple-200' : 'border-gray-200',
                          ].join(' ')}
                        >
                          {/* 아이콘 */}
                          <div className={[
                            'flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-xl',
                            mine ? 'bg-indigo-100' : isOpen ? 'bg-purple-100' : 'bg-gray-100',
                          ].join(' ')}>
                            {isOpen ? '🌐' : '👥'}
                          </div>

                          {/* 정보 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="whitespace-nowrap font-bold text-gray-800 text-sm">
                                {cell.name}
                              </span>
                              {mine && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 whitespace-nowrap">
                                  내 순
                                </span>
                              )}
                              {isOpen && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 whitespace-nowrap">
                                  전체 개방
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {!isOpen && (
                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                  순장 {cell.leaderName}
                                </span>
                              )}
                              <span className="text-xs text-gray-400 whitespace-nowrap">
                                {!isOpen && '· '}셀원 {cell.memberCount}명
                              </span>
                            </div>
                          </div>

                          {/* 입장 버튼 */}
                          <button
                            onClick={() => enter && handleEnter(cell)}
                            disabled={!enter}
                            className={[
                              'flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all min-h-[40px]',
                              enter
                                ? isOpen
                                  ? 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                            ].join(' ')}
                          >
                            {enter ? '입장 →' : '비공개'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        })()}

        {/* 안내 */}
        {!loading && myProfile && !myProfile.cell_id && myProfile.role !== 'pastor' && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center">
            <p className="text-sm text-amber-700" style={{ wordBreak: 'keep-all' }}>
              아직 순에 배정되지 않았어요.<br />담당 교역자에게 문의해 주세요.
            </p>
          </div>
        )}

        <div className="h-6" />
      </div>
    </div>
  )
}
