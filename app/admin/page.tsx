'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Stats {
  pendingCount: number
  memberCount: number
  cellCount: number
  approvedToday: number
}

export default function AdminDashboard() {
  const supabase = createClient()
  const [stats, setStats] = useState<Stats>({ pendingCount: 0, memberCount: 0, cellCount: 0, approvedToday: 0 })
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles').select('role, cell_id, mission_id').eq('id', user.id).single()
      const role = (profile?.role ?? '') as string
      setMyRole(role)

      const today = new Date().toISOString().slice(0, 10)

      // 미처리 신청 수
      let pendingQ = supabase.from('cell_join_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      if (role === 'cell_leader' || role === 'school_teacher') {
        pendingQ = pendingQ.eq('cell_id', profile?.cell_id ?? -1)
      } else if (role === 'youth_pastor') {
        const { data: cells } = await supabase.from('cells').select('id').eq('mission_id', profile?.mission_id ?? -1)
        const ids = cells?.map((c: { id: number }) => c.id) ?? []
        pendingQ = pendingQ.in('cell_id', ids.length ? ids : [-1])
      } else if (role === 'mission_leader') {
        const { data: cells } = await supabase.from('cells').select('id').eq('mission_id', profile?.mission_id ?? -1)
        const ids = cells?.map((c: { id: number }) => c.id) ?? []
        pendingQ = pendingQ.in('cell_id', ids.length ? ids : [-1])
      } else if (role === 'school_pastor') {
        // 교회학교 mission 찾기
        const { data: mission } = await supabase.from('missions').select('id').eq('name', '교회학교').single()
        const { data: cells } = await supabase.from('cells').select('id').eq('mission_id', mission?.id ?? -1)
        const ids = cells?.map((c: { id: number }) => c.id) ?? []
        pendingQ = pendingQ.in('cell_id', ids.length ? ids : [-1])
      }
      const { count: pendingCount } = await pendingQ

      // 성도 수 (pastor만)
      let memberCount = 0
      if (role === 'pastor') {
        const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
        memberCount = count ?? 0
      }

      // 순 수
      let cellCount = 0
      const { count: cc } = await supabase.from('cells').select('id', { count: 'exact', head: true })
      cellCount = cc ?? 0

      // 오늘 승인 수
      const { count: approvedToday } = await supabase
        .from('cell_join_requests').select('id', { count: 'exact', head: true })
        .eq('status', 'approved').gte('updated_at', `${today}T00:00:00`)

      setStats({ pendingCount: pendingCount ?? 0, memberCount, cellCount, approvedToday: approvedToday ?? 0 })
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cards = [
    { label: '미처리 신청', value: stats.pendingCount, emoji: '📋', href: '/admin/requests', highlight: stats.pendingCount > 0 },
    { label: '오늘 승인', value: stats.approvedToday, emoji: '✅', href: '/admin/requests' },
    { label: '전체 순/반', value: stats.cellCount, emoji: '👥', href: '/admin/cells' },
    ...(myRole === 'pastor' ? [{ label: '전체 성도', value: stats.memberCount, emoji: '👤', href: '/admin/members' }] : []),
  ]

  return (
    <div className="px-4 py-6 max-w-screen-md mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-6">📊 대시보드</h1>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* 통계 카드 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {cards.map((card) => (
              <Link key={card.label} href={card.href}>
                <div className={[
                  'bg-white rounded-2xl border-2 p-4 shadow-sm hover:shadow-md transition-all',
                  card.highlight ? 'border-red-300 bg-red-50' : 'border-gray-200',
                ].join(' ')}>
                  <div className="text-2xl mb-1">{card.emoji}</div>
                  <div className={['text-2xl font-bold', card.highlight ? 'text-red-600' : 'text-gray-800'].join(' ')}>
                    {card.value}
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap mt-0.5">{card.label}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* 미처리 신청 알림 */}
          {stats.pendingCount > 0 && (
            <Link href="/admin/requests">
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-300 rounded-2xl mb-4 hover:bg-amber-100 transition-colors">
                <span className="text-2xl">🔔</span>
                <div>
                  <p className="font-bold text-amber-800 text-sm whitespace-nowrap">
                    미처리 순 배치 신청 {stats.pendingCount}건
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5" style={{ wordBreak: 'keep-all' }}>
                    탭하여 확인하고 승인 또는 거절해 주세요
                  </p>
                </div>
                <span className="ml-auto text-amber-500 font-bold whitespace-nowrap">확인 →</span>
              </div>
            </Link>
          )}

          {/* 빠른 메뉴 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/admin/requests" className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <span className="text-xl">📋</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm whitespace-nowrap">순 배치 신청 관리</p>
                <p className="text-xs text-gray-400 mt-0.5" style={{ wordBreak: 'keep-all' }}>신청 승인 · 거절</p>
              </div>
            </Link>
            <Link href="/admin/members" className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <span className="text-xl">👤</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm whitespace-nowrap">성도 목록</p>
                <p className="text-xs text-gray-400 mt-0.5" style={{ wordBreak: 'keep-all' }}>역할 · 순 현황 조회</p>
              </div>
            </Link>
            <Link href="/admin/cells" className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <span className="text-xl">👥</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm whitespace-nowrap">순/반 목록</p>
                <p className="text-xs text-gray-400 mt-0.5" style={{ wordBreak: 'keep-all' }}>인원 현황 · 관리</p>
              </div>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
