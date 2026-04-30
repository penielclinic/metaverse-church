'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import SpaceCard from '@/components/world/SpaceCard'
import { useWorldStore } from '@/store/worldStore'
import { useAvatarStore } from '@/store/avatarStore'
import AvatarPreview from '@/components/world/AvatarPreview'
import { SPACES } from '@/lib/spaces'
import { createClient } from '@/lib/supabase/client'

interface Notice {
  id: number
  content: string
}

export default function WorldPage() {
  const router = useRouter()
  const { setCurrentSpace, getSpaceUserCount } = useWorldStore()
  const { name, level, skinTone, gender, hairStyle, outfit,
          eyeMakeup, glasses, earring, necklace, hat } = useAvatarStore()
  const supabase = createClient()

  const [notice, setNotice]       = useState<Notice | null>(null)
  const [myRole, setMyRole]       = useState('')
  const [myUserId, setMyUserId]   = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [editing, setEditing]     = useState(false)
  const [draft, setDraft]         = useState('')
  const [saving, setSaving]       = useState(false)

  const isAdmin = ['pastor', 'youth_pastor'].includes(myRole)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setMyUserId(user.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase as any)
          .from('profiles').select('role').eq('id', user.id).single()
        setMyRole(profile?.role ?? '')
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('notices')
        .select('id, content')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data) setNotice(data)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveNotice = async () => {
    if (!draft.trim()) return
    setSaving(true)
    if (notice) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('notices').update({ content: draft.trim() }).eq('id', notice.id)
      setNotice({ ...notice, content: draft.trim() })
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('notices')
        .insert({ content: draft.trim(), created_by: myUserId })
        .select('id, content').single()
      if (data) setNotice(data)
    }
    setSaving(false)
    setEditing(false)
    setDraft('')
    setDismissed(false)
  }

  const deleteNotice = async () => {
    if (!notice || !confirm('공지를 삭제할까요?')) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('notices').delete().eq('id', notice.id)
    setNotice(null)
    setEditing(false)
  }

  const handleEnterSpace = (slug: string, name: string, path: string) => {
    setCurrentSpace(slug, name)
    router.push(path)
  }

  return (
    <div className="px-4 py-6 max-w-screen-md mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800" style={{ wordBreak: 'keep-all' }}>
          이음 메타버스에 오신 걸 환영합니다 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500" style={{ wordBreak: 'keep-all' }}>
          아래 공간을 선택해 입장하세요. 함께 예배하고 교제해요.
        </p>
      </div>

      {/* ── 알림글 배너 ── */}
      {editing ? (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 mb-2">📢 알림글 {notice ? '수정' : '작성'}</p>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="공지 내용을 입력하세요"
            rows={3}
            className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white mb-2"
          />
          <div className="flex gap-2 justify-end">
            {notice && (
              <button onClick={deleteNotice} className="text-xs px-3 py-1.5 rounded-full border border-red-200 text-red-400 hover:bg-red-50">
                삭제
              </button>
            )}
            <button onClick={() => { setEditing(false); setDraft('') }} className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-500">
              취소
            </button>
            <button onClick={saveNotice} disabled={saving || !draft.trim()} className="text-xs px-3 py-1.5 rounded-full bg-amber-500 text-white font-semibold disabled:opacity-50">
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      ) : notice && !dismissed ? (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
          <span className="text-lg flex-shrink-0">📢</span>
          <p className="flex-1 text-sm text-amber-900 leading-relaxed" style={{ wordBreak: 'keep-all' }}>
            {notice.content}
          </p>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {isAdmin && (
              <button onClick={() => { setDraft(notice.content); setEditing(true) }} className="text-[11px] text-amber-500 hover:text-amber-700">
                수정
              </button>
            )}
            <button onClick={() => setDismissed(true)} className="text-[11px] text-gray-400 hover:text-gray-600">
              닫기
            </button>
          </div>
        </div>
      ) : isAdmin && !editing ? (
        <button
          onClick={() => { setDraft(''); setEditing(true) }}
          className="mb-5 w-full text-xs text-amber-400 border border-dashed border-amber-200 rounded-2xl py-2 hover:bg-amber-50 transition-colors"
        >
          + 알림글 {notice ? '수정' : '작성'}
        </button>
      ) : null}

      {/* 아바타 카드 */}
      <Link href="/world/avatar">
        <div className="flex items-center gap-4 mb-6 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl hover:bg-indigo-100 transition-colors cursor-pointer">
          <div className="flex-shrink-0 w-14 h-14 rounded-full bg-white border-2 border-indigo-200 overflow-hidden flex items-center justify-center">
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
              size={56}
              faceOnly
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-indigo-800 whitespace-nowrap truncate">
              {name} · Lv.{level}
            </p>
            <p className="text-xs text-indigo-500 mt-0.5" style={{ wordBreak: 'keep-all' }}>
              아바타를 꾸며보세요
            </p>
          </div>
          <span className="flex-shrink-0 text-xs font-semibold text-indigo-600 bg-white border border-indigo-200 px-3 py-1.5 rounded-full whitespace-nowrap">
            꾸미기 →
          </span>
        </div>
      </Link>

      {/* 공간 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SPACES.map((space) => (
          <SpaceCard
            key={space.slug}
            emoji={space.emoji}
            name={space.name}
            description={space.description}
            slug={space.slug}
            onlineCount={getSpaceUserCount(space.slug)}
            disabled={space.disabled}
            onClick={() => {
              if (!space.disabled) {
                handleEnterSpace(space.slug, space.name, space.path)
              }
            }}
          />
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">
        회색 카드는 준비 중인 공간입니다.
      </p>
    </div>
  )
}
