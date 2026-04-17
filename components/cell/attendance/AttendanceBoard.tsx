'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type AttendanceStatus = 'present' | 'absent' | 'late' | null

interface Member {
  id: string
  name: string
  avatar?: {
    skin_tone: string
    hair_style: string
    gender: string
    outfit: string
  } | null
  status: AttendanceStatus
}

interface AttendanceBoardProps {
  cellId: number
  date?: string // YYYY-MM-DD, 기본값: 오늘
}

const STATUS_CONFIG = {
  present: { icon: '✅', label: '출석', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  absent:  { icon: '❌', label: '결석', bg: 'bg-red-100',   text: 'text-red-700',   border: 'border-red-300'   },
  late:    { icon: '🕐', label: '지각', bg: 'bg-yellow-100',text: 'text-yellow-700',border: 'border-yellow-300' },
} as const

export default function AttendanceBoard({ cellId, date }: AttendanceBoardProps) {
  const today = date ?? new Date().toISOString().slice(0, 10)
  const [members, setMembers] = useState<Member[]>([])
  const [isLeader, setIsLeader] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)
    // 현재 유저 role 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    setIsLeader(profile?.role === 'cell_leader' || profile?.role === 'pastor')

    // 해당 셀 순원 목록 + 아바타
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profilesData } = await (supabase as any)
      .from('profiles')
      .select('id, name, avatars(skin_tone, hair_style, gender, outfit)')
      .eq('cell_id', cellId)

    // 오늘 출석 현황 조회
    const { data: logs } = await supabase
      .from('attendance_logs' as never)
      .select('user_id, status')
      .eq('cell_id', cellId as never)
      .eq('date', today as never)

    const logMap = new Map<string, AttendanceStatus>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (logs ?? []).map((l: any) => [l.user_id, l.status as AttendanceStatus])
    )

    setMembers(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (profilesData ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        avatar: Array.isArray(p.avatars) ? p.avatars[0] ?? null : p.avatars ?? null,
        status: logMap.get(p.id) ?? null,
      }))
    )
    setLoading(false)
  }, [cellId, today]) // supabase is stable

  useEffect(() => { fetchData() }, [fetchData])

  const handleStatus = async (memberId: string, status: AttendanceStatus) => {
    if (!isLeader || saving) return
    setSaving(memberId)

    const res = await fetch('/api/cell/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: memberId, cellId, status, date: today }),
    })

    if (res.ok) {
      setMembers(prev =>
        prev.map(m => m.id === memberId ? { ...m, status } : m)
      )
    }
    setSaving(null)
  }

  const presentCount = members.filter(m => m.status === 'present').length
  const totalCount   = members.length

  const AvatarIcon = ({ member }: { member: Member }) => {
    // 간단한 텍스트 아바타 (아바타 정보가 없으면 이니셜)
    const initials = member.name.slice(0, 1)
    const bgColors: Record<string, string> = {
      light: 'bg-amber-100', medium: 'bg-amber-200',
      tan: 'bg-amber-300', dark: 'bg-amber-700',
    }
    const bg = bgColors[member.avatar?.skin_tone ?? 'medium'] ?? 'bg-gray-200'
    return (
      <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center text-sm font-bold text-gray-700 flex-shrink-0`}>
        {initials}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        출석 현황 불러오는 중...
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 헤더 — 전체 출석률 */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-base">출석 체크판</h2>
          <div className="text-white text-sm font-medium">
            <span className="text-2xl font-bold">{presentCount}</span>
            <span className="opacity-80">/{totalCount}명 출석</span>
          </div>
        </div>
        {/* 진행 바 */}
        <div className="mt-2 bg-white/30 rounded-full h-2">
          <div
            className="bg-white rounded-full h-2 transition-all duration-500"
            style={{ width: totalCount > 0 ? `${(presentCount / totalCount) * 100}%` : '0%' }}
          />
        </div>
        <p className="text-white/70 text-xs mt-1">
          {today} · {isLeader ? '순장 모드' : '읽기 전용'}
        </p>
      </div>

      {/* 순원 목록 */}
      <ul className="divide-y divide-gray-50">
        {members.map(member => {
          const cfg = member.status ? STATUS_CONFIG[member.status] : null
          return (
            <li key={member.id} className="flex items-center gap-3 px-4 py-3">
              <AvatarIcon member={member} />

              <span className="flex-1 text-sm font-medium text-gray-800 whitespace-nowrap">
                {member.name}
              </span>

              {/* 현재 상태 뱃지 */}
              {cfg && (
                <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} whitespace-nowrap`}>
                  {cfg.icon} {cfg.label}
                </span>
              )}

              {/* 순장 전용 버튼 */}
              {isLeader ? (
                <div className="flex gap-1 ml-1">
                  {(['present', 'late', 'absent'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatus(member.id, s)}
                      disabled={saving === member.id}
                      className={`text-lg leading-none p-1 rounded-lg transition-all
                        ${member.status === s
                          ? 'bg-gray-100 ring-2 ring-offset-1 ring-gray-400'
                          : 'opacity-50 hover:opacity-100 hover:bg-gray-50'
                        }
                        ${saving === member.id ? 'cursor-wait' : 'cursor-pointer'}
                      `}
                      title={STATUS_CONFIG[s].label}
                    >
                      {STATUS_CONFIG[s].icon}
                    </button>
                  ))}
                </div>
              ) : (
                !cfg && (
                  <span className="text-xs text-gray-300 whitespace-nowrap">미입력</span>
                )
              )}
            </li>
          )
        })}

        {members.length === 0 && (
          <li className="text-center text-gray-400 text-sm py-8">
            순원이 없습니다.
          </li>
        )}
      </ul>
    </div>
  )
}
