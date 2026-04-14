'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AvatarPreview from '@/components/world/AvatarPreview'
import type { SkinTone, Gender, Outfit } from '@/components/world/AvatarPreview'

interface Message {
  id: string
  userId: string
  name: string
  text: string
  time: string
}

interface Member {
  userId: string
  name: string
  titles: string[]
  skinTone: SkinTone
  gender: Gender
  hairStyle: string
  outfit: Outfit
  level: number
}

export default function CellRoomPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [cellName, setCellName] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [input, setInput] = useState('')
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [myProfile, setMyProfile] = useState<Member | null>(null)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [profileCard, setProfileCard] = useState<Member | null>(null) // 클릭한 상대 아바타
  const bottomRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // 초기 로드: 권한 확인 + 셀 이름 + Presence 입장
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyUserId(user.id)

      // 셀 정보
      const { data: cell } = await supabase
        .from('cells')
        .select('name')
        .eq('id', Number(id))
        .single()
      setCellName(cell?.name ?? `순 ${id}`)

      // 프로필 + 아바타
      const { data: profileRaw } = await supabase
        .from('profiles')
        .select('name, role, cell_id, titles')
        .eq('id', user.id)
        .single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profile = profileRaw as any

      const { data: avatarRaw } = await supabase
        .from('avatars')
        .select('skin_tone, gender, hair_style, outfit, level')
        .eq('user_id', user.id)
        .single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const avatar = avatarRaw as any

      // 권한: 목사 또는 해당 순 소속
      const ok = profile?.role === 'pastor' || profile?.role === 'youth_pastor' || Number(profile?.cell_id) === Number(id)
      setAuthorized(ok)
      if (!ok) return

      const me: Member = {
        userId: user.id,
        name: profile?.name ?? '성도',
        titles: Array.isArray(profile?.titles) ? profile.titles : [],
        skinTone: (avatar?.skin_tone ?? 'medium') as SkinTone,
        gender: (avatar?.gender ?? 'male') as Gender,
        hairStyle: avatar?.hair_style ?? 'short',
        outfit: (avatar?.outfit ?? 'casual') as Outfit,
        level: avatar?.level ?? 1,
      }
      setMyProfile(me)

      // Supabase Realtime channel
      const channel = supabase.channel(`cell-room-${id}`, {
        config: { presence: { key: user.id } },
      })

      // Presence sync → 접속자 목록 갱신
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<Member>()
        const online: Member[] = Object.values(state).flat()
        setMembers(online)
      })

      // broadcast → 채팅 메시지 수신
      channel.on('broadcast', { event: 'chat' }, ({ payload }) => {
        setMessages((prev) => [...prev, payload as Message])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })

      await channel.subscribe()
      await channel.track(me)
      channelRef.current = channel
    }

    init()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const sendMessage = async () => {
    if (!input.trim() || !myUserId || !myProfile || !channelRef.current) return
    const msg: Message = {
      id: `${Date.now()}-${myUserId}`,
      userId: myUserId,
      name: myProfile.name,
      text: input.trim(),
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    }
    await channelRef.current.send({ type: 'broadcast', event: 'chat', payload: msg })
    setMessages((prev) => [...prev, msg])
    setInput('')
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  // 로딩 중
  if (authorized === null) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-56px)]">
        <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // 권한 없음
  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] gap-4 px-4 text-center">
        <span className="text-5xl">🔒</span>
        <p className="text-gray-600" style={{ wordBreak: 'keep-all' }}>
          이 순 모임방에 입장할 권한이 없습니다.<br />
          소속 순의 방에만 입장할 수 있어요.
        </p>
        <button
          onClick={() => router.push('/world/cell')}
          className="px-6 py-3 bg-indigo-600 text-white rounded-full text-sm font-semibold"
        >
          목록으로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-gradient-to-b from-indigo-50 to-white">

      {/* 상단 헤더 */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <button
          onClick={() => router.push('/world/cell')}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
          aria-label="목록으로"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-800 text-sm whitespace-nowrap truncate">
            👥 {cellName}
          </h1>
          <p className="text-xs text-gray-400">{members.length}명 접속 중</p>
        </div>
      </div>

      {/* 접속자 아바타 띠 — 클릭 시 프로필 카드 표시 */}
      {members.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex-shrink-0 overflow-x-auto">
          {members.map((m) => (
            <button
              key={m.userId}
              onClick={() => setProfileCard(profileCard?.userId === m.userId ? null : m)}
              className="flex flex-col items-center gap-0.5 flex-shrink-0 focus:outline-none"
            >
              <div className="relative w-10 h-10">
                <div className={[
                  'w-10 h-10 rounded-full bg-white border-2 overflow-hidden transition-all',
                  profileCard?.userId === m.userId ? 'border-indigo-500 scale-110' : 'border-indigo-200',
                ].join(' ')}>
                  <AvatarPreview
                    skinTone={m.skinTone}
                    gender={m.gender}
                    hairStyle={m.hairStyle}
                    outfit={m.outfit}
                    size={40}
                    faceOnly
                  />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-indigo-600 text-white text-[8px] font-bold flex items-center justify-center border border-white">
                  {m.level}
                </span>
              </div>
              <span className="text-[9px] text-gray-500 whitespace-nowrap max-w-[40px] truncate">
                {m.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 채팅 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="text-4xl">💬</span>
            <p className="text-sm text-gray-400" style={{ wordBreak: 'keep-all' }}>
              아직 대화가 없어요. 먼저 인사를 건네보세요!
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.userId === myUserId
          return (
            <div
              key={msg.id}
              className={['flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row'].join(' ')}
            >
              {/* 상대방 아바타 */}
              {!isMe && (() => {
                const sender = members.find((m) => m.userId === msg.userId)
                return (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 overflow-hidden flex-shrink-0 mt-0.5">
                    {sender ? (
                      <AvatarPreview
                        skinTone={sender.skinTone}
                        gender={sender.gender}
                        hairStyle={sender.hairStyle}
                        outfit={sender.outfit}
                        size={32}
                        faceOnly
                      />
                    ) : (
                      <span className="flex items-center justify-center h-full text-sm">👤</span>
                    )}
                  </div>
                )
              })()}

              <div className={['flex flex-col gap-0.5 max-w-[70%]', isMe ? 'items-end' : 'items-start'].join(' ')}>
                {!isMe && (
                  <span className="text-[10px] text-gray-400 px-1 whitespace-nowrap">{msg.name}</span>
                )}
                <div className={[
                  'px-3 py-2 rounded-2xl text-sm leading-snug',
                  isMe
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm',
                ].join(' ')}
                  style={{ wordBreak: 'keep-all' }}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-gray-400 px-1">{msg.time}</span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 프로필 카드 — 아바타 클릭 시 */}
      {profileCard && (
        <div className="mx-4 mb-0 px-4 py-3 bg-white border border-indigo-200 rounded-2xl shadow-md flex items-center gap-3 flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-indigo-50 border-2 border-indigo-200 overflow-hidden flex-shrink-0">
            <AvatarPreview
              skinTone={profileCard.skinTone}
              gender={profileCard.gender}
              hairStyle={profileCard.hairStyle}
              outfit={profileCard.outfit}
              size={48}
              faceOnly
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 text-sm whitespace-nowrap">{profileCard.name}</p>
            {profileCard.titles.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {profileCard.titles.map(t => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium whitespace-nowrap">
                    {t}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">직분 미설정</p>
            )}
          </div>
          <button onClick={() => setProfileCard(null)} className="flex-shrink-0 text-gray-400 p-1" aria-label="닫기">✕</button>
        </div>
      )}

      {/* 입력창 */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-t border-gray-200 flex-shrink-0 pb-safe">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
          placeholder="메시지를 입력하세요..."
          maxLength={300}
          className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[44px]"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="flex-shrink-0 w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 active:scale-95 disabled:opacity-40 transition-all"
          aria-label="전송"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 rotate-90">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
