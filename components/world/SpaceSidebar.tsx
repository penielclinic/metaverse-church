'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SPACES } from '@/lib/spaces'
import { useWorldStore } from '@/store/worldStore'

export default function SpaceSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { setCurrentSpace, getSpaceUserCount } = useWorldStore()
  const [showPwModal, setShowPwModal] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState(false)

  const handleEnter = (slug: string, name: string, path: string, disabled?: boolean) => {
    if (disabled) return
    setCurrentSpace(slug, name)
    router.push(path)
  }

  return (
    <>
      {/* 데스크톱: 고정 왼쪽 사이드바 */}
      <aside className="hidden md:flex fixed left-0 top-14 bottom-0 w-20 flex-col bg-white border-r border-gray-200 shadow-sm z-40 overflow-y-auto">
        <nav className="flex flex-col gap-1 py-3 px-1.5">
          {/* 대시보드 */}
          <button
            onClick={() => router.push('/world')}
            title="대시보드"
            className={[
              'relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all text-center',
              pathname === '/world'
                ? 'bg-indigo-100 text-indigo-700'
                : 'hover:bg-indigo-50 text-gray-600 hover:text-indigo-700 cursor-pointer',
            ].join(' ')}
          >
            <span className="text-2xl leading-none">🏠</span>
            <span className="text-[10px] font-semibold leading-tight whitespace-nowrap">대시보드</span>
            {pathname === '/world' && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />
            )}
          </button>

          {/* 구분선 */}
          <div className="my-1 mx-2 h-px bg-gray-100" />

          {SPACES.map((space) => {
            const isActive = pathname.startsWith(space.path)
            const count = getSpaceUserCount(space.slug)
            return (
              <button
                key={space.slug}
                onClick={() => handleEnter(space.slug, space.name, space.path, space.disabled)}
                disabled={space.disabled}
                title={space.description}
                className={[
                  'relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all text-center',
                  isActive
                    ? 'bg-indigo-100 text-indigo-700'
                    : space.disabled
                    ? 'opacity-40 cursor-not-allowed text-gray-400'
                    : 'hover:bg-indigo-50 text-gray-600 hover:text-indigo-700 cursor-pointer',
                ].join(' ')}
              >
                <span className="text-2xl leading-none">{space.emoji}</span>
                <span className="text-[10px] font-semibold leading-tight whitespace-nowrap">
                  {space.name}
                </span>
                {/* 접속자 수 뱃지 */}
                {!space.disabled && count > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-green-400 text-white text-[8px] font-bold flex items-center justify-center leading-none">
                    {count}
                  </span>
                )}
                {/* 활성 인디케이터 */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />
                )}
              </button>
            )
          })}

          {/* 구분선 */}
          <div className="my-1 mx-2 h-px bg-gray-100" />

          {/* 관리자 페이지 */}
          <button
            onClick={() => setShowPwModal(true)}
            title="관리자 페이지"
            className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl hover:bg-red-50 text-gray-500 hover:text-red-600 cursor-pointer transition-all text-center"
          >
            <span className="text-2xl leading-none">🔒</span>
            <span className="text-[10px] font-semibold leading-tight whitespace-nowrap">관리자</span>
          </button>
        </nav>
      </aside>

      {/* 모바일: 고정 하단 탭바 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex overflow-x-auto scrollbar-hide">
          {/* 대시보드 */}
          <button
            onClick={() => router.push('/world')}
            className={[
              'relative flex flex-col items-center gap-0.5 py-2 px-3 min-w-[64px] flex-shrink-0 transition-all',
              pathname === '/world' ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-600',
            ].join(' ')}
          >
            <span className="text-xl leading-none">🏠</span>
            <span className="text-[10px] font-medium whitespace-nowrap">대시보드</span>
            {pathname === '/world' && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>

          {SPACES.map((space) => {
            const isActive = pathname.startsWith(space.path)
            const count = getSpaceUserCount(space.slug)
            return (
              <button
                key={space.slug}
                onClick={() => handleEnter(space.slug, space.name, space.path, space.disabled)}
                disabled={space.disabled}
                className={[
                  'relative flex flex-col items-center gap-0.5 py-2 px-3 min-w-[64px] flex-shrink-0 transition-all',
                  isActive
                    ? 'text-indigo-600'
                    : space.disabled
                    ? 'opacity-40 cursor-not-allowed text-gray-400'
                    : 'text-gray-500 hover:text-indigo-600',
                ].join(' ')}
              >
                <span className="text-xl leading-none">{space.emoji}</span>
                <span className="text-[10px] font-medium whitespace-nowrap">{space.name}</span>
                {/* 활성 탭 인디케이터 */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-500 rounded-full" />
                )}
                {/* 접속자 수 뱃지 */}
                {!space.disabled && count > 0 && (
                  <span className="absolute top-1 right-2 min-w-[14px] h-3.5 px-0.5 rounded-full bg-green-400 text-white text-[8px] font-bold flex items-center justify-center leading-none">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── 관리자 페이지 비밀번호 모달 ── */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowPwModal(false); setPw(''); setPwError(false) }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-72 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-center font-bold text-gray-800" style={{ wordBreak: 'keep-all' }}>관리자 비밀번호 입력</h3>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pw}
              onChange={(e) => { setPw(e.target.value); setPwError(false) }}
              placeholder="비밀번호 4자리"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-400"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (pw === '0000') { setShowPwModal(false); setPw(''); router.push('/admin') }
                  else setPwError(true)
                }
              }}
            />
            {pwError && <p className="text-xs text-red-500 text-center">비밀번호가 틀렸습니다</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowPwModal(false); setPw(''); setPwError(false) }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-semibold"
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (pw === '0000') { setShowPwModal(false); setPw(''); router.push('/admin') }
                  else setPwError(true)
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
