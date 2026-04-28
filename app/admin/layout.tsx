'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const ADMIN_ROLES = ['pastor', 'school_pastor', 'mission_leader', 'youth_pastor', 'youth_leader', 'youth_vice_leader', 'youth_secretary', 'school_teacher', 'cell_leader']

const NAV = [
  { href: '/admin',          label: '대시보드', emoji: '📊' },
  { href: '/admin/requests', label: '순 신청',  emoji: '📋' },
  { href: '/admin/members',  label: '성도 목록', emoji: '👤' },
  { href: '/admin/cells',    label: '순/반 목록', emoji: '👥' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [role, setRole] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data: profile } = await supabase
        .from('profiles').select('role, name').eq('id', user.id).single()
      if (!profile || !ADMIN_ROLES.includes(profile.role)) {
        router.replace('/world')
        return
      }
      setRole(profile.role)
      setName(profile.name)
      setChecking(false)
    }
    check()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const ROLE_LABEL: Record<string, string> = {
    pastor: '담임목사', school_pastor: '교회학교 목사', mission_leader: '선교회장',
    youth_pastor: '청년부 교역자', school_teacher: '교회학교 교사',
    youth_leader: '청년회장', youth_vice_leader: '청년부회장', youth_secretary: '청년부총무',
    cell_leader: '순장',
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 상단 헤더 */}
      <header className="bg-indigo-700 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Link href="/world" className="text-indigo-200 hover:text-white text-sm transition-colors whitespace-nowrap">
            ← 메타버스
          </Link>
          <span className="text-indigo-400">|</span>
          <span className="font-bold text-sm whitespace-nowrap">관리자 페이지</span>
        </div>
        <div className="text-xs text-indigo-200 text-right">
          <span className="whitespace-nowrap">{name}</span>
          <span className="ml-1 px-1.5 py-0.5 rounded bg-indigo-600 whitespace-nowrap">
            {ROLE_LABEL[role ?? ''] ?? role}
          </span>
        </div>
      </header>

      <div className="flex flex-1">
        {/* 사이드 네비 (데스크톱) */}
        <nav className="hidden md:flex flex-col w-44 bg-white border-r border-gray-200 pt-4 gap-1 px-2 flex-shrink-0">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                ].join(' ')}
              >
                <span>{item.emoji}</span>
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* 콘텐츠 */}
        <main className="flex-1 min-w-0 pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* 하단 탭바 (모바일) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex-1 flex flex-col items-center gap-0.5 py-2 text-center transition-all',
                active ? 'text-indigo-600' : 'text-gray-500',
              ].join(' ')}
            >
              <span className="text-xl">{item.emoji}</span>
              <span className="text-[10px] font-medium whitespace-nowrap">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
