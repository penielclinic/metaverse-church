'use client'

import Link from 'next/link'
import { useAvatarStore } from '@/store/avatarStore'
import { useWorldStore } from '@/store/worldStore'
import AvatarPreview from '@/components/world/AvatarPreview'

export default function HUD() {
  const { name, level, exp, expToNext, badge, skinTone, gender, hairStyle, outfit,
          eyeMakeup, glasses, earring, necklace, hat } = useAvatarStore()
  const { currentSpaceName, totalOnline } = useWorldStore()

  const expPercent = Math.min(Math.round((exp / expToNext) * 100), 100)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-4 h-14 max-w-screen-lg mx-auto">

        {/* 왼쪽: 아바타 레벨 + 이름 */}
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/world/avatar">
            {/* relative 래퍼 — overflow-hidden 밖에서 뱃지 렌더링 */}
            <div className="relative flex-shrink-0 w-10 h-10 cursor-pointer">
              {/* 아바타 얼굴 원형 — overflow-hidden으로 원 밖 SVG 클립 */}
              <div className="w-10 h-10 rounded-full bg-indigo-100 overflow-hidden hover:ring-2 hover:ring-indigo-400 transition-all">
                <AvatarPreview
                  skinTone={skinTone as 'light' | 'medium' | 'tan' | 'dark'}
                  gender={gender}
                  hairStyle={hairStyle}
                  outfit={outfit as 'casual' | 'formal' | 'hanbok' | 'worship_team' | 'pastor'}
                  eyeMakeup={eyeMakeup}
                  glasses={glasses}
                  earring={earring}
                  necklace={necklace}
                  hat={hat}
                  size={40}
                  faceOnly
                />
              </div>
              {/* 레벨 뱃지 — overflow-hidden 바깥 absolute */}
              <span className="absolute -bottom-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center leading-none border border-white">
                {level}
              </span>
            </div>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="whitespace-nowrap text-sm font-semibold text-gray-800 truncate max-w-[80px]">
                {name}
              </span>
              {badge && (
                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  {badge}
                </span>
              )}
            </div>
            {/* 경험치 바 (모바일에서만 왼쪽에 표시) */}
            <div className="flex items-center gap-1 md:hidden">
              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${expPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400">{exp}/{expToNext}</span>
            </div>
          </div>
        </div>

        {/* 가운데: 현재 공간 이름 */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span className="text-xs text-gray-400 leading-none">현재 공간</span>
          <span className="whitespace-nowrap text-sm font-bold text-gray-700 mt-0.5">
            {currentSpaceName}
          </span>
        </div>

        {/* 오른쪽: 경험치 바 (태블릿+) + 접속자 수 + 알림 */}
        <div className="flex items-center gap-3">
          {/* 경험치 바 (md 이상) */}
          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-xs text-gray-400 whitespace-nowrap">
              Lv.{level} EXP
            </span>
            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${expPercent}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {exp}/{expToNext}
            </span>
          </div>

          {/* 접속자 수 */}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
            <span className="whitespace-nowrap">{totalOnline}명</span>
          </div>

          {/* 아바타 편집 버튼 */}
          <Link
            href="/world/avatar"
            className="text-xs px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold hover:bg-indigo-200 transition-colors whitespace-nowrap"
          >
            아바타
          </Link>

          {/* 알림 아이콘 */}
          <button
            className="relative p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="알림"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {/* 알림 뱃지 */}
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>
    </header>
  )
}
