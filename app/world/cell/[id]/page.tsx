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

interface CellNote {
  id: number
  userId: string
  authorName: string
  content: string
  color: string
  createdAt: string
}

const NOTE_COLORS = [
  { value: 'yellow', bg: 'bg-amber-100',   border: 'border-amber-300',   text: 'text-amber-900',   dot: 'bg-amber-400' },
  { value: 'pink',   bg: 'bg-pink-100',    border: 'border-pink-300',    text: 'text-pink-900',    dot: 'bg-pink-400' },
  { value: 'blue',   bg: 'bg-sky-100',     border: 'border-sky-300',     text: 'text-sky-900',     dot: 'bg-sky-400' },
  { value: 'green',  bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-900', dot: 'bg-emerald-400' },
  { value: 'purple', bg: 'bg-violet-100',  border: 'border-violet-300',  text: 'text-violet-900',  dot: 'bg-violet-400' },
]

const NOTE_ROTATIONS = ['-rotate-1', 'rotate-1', '-rotate-2', 'rotate-2', 'rotate-0', '-rotate-1', 'rotate-1']

function getNoteStyle(color: string) {
  return NOTE_COLORS.find(c => c.value === color) ?? NOTE_COLORS[0]
}

export default function CellRoomPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<'chat' | 'board'>('chat')
  const [cellName, setCellName] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [input, setInput] = useState('')
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [myProfile, setMyProfile] = useState<Member | null>(null)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [profileCard, setProfileCard] = useState<Member | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // 보드 상태
  const [notes, setNotes] = useState<CellNote[]>([])
  const [noteInput, setNoteInput] = useState('')
  const [noteColor, setNoteColor] = useState('yellow')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [postingNote, setPostingNote] = useState(false)

  // 초기 로드
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyUserId(user.id)

      const { data: cell } = await supabase
        .from('cells')
        .select('name')
        .eq('id', Number(id))
        .single()
      setCellName(cell?.name ?? `순 ${id}`)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profileRaw } = await (supabase.from('profiles') as any)
        .select('name, role, cell_id, titles')
        .eq('id', user.id)
        .single()
      const profile = profileRaw as { name?: string; role?: string; cell_id?: number; titles?: string[] } | null

      const { data: avatarRaw } = await supabase
        .from('avatars')
        .select('skin_tone, gender, hair_style, outfit, level')
        .eq('user_id', user.id)
        .single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const avatar = avatarRaw as any

      const ok = profile?.role === 'pastor' || profile?.role === 'youth_pastor' || Number(profile?.cell_id) === Number(id)
      setAuthorized(ok)
      if (!ok) return

      const me: Member = {
        userId: user.id,
        name: profile?.name ?? '성도',
        titles: Array.isArray(profile?.titles) ? profile!.titles! : [],
        skinTone: (avatar?.skin_tone ?? 'medium') as SkinTone,
        gender: (avatar?.gender ?? 'male') as Gender,
        hairStyle: avatar?.hair_style ?? 'short',
        outfit: (avatar?.outfit ?? 'casual') as Outfit,
        level: avatar?.level ?? 1,
      }
      setMyProfile(me)

      // 쪽지 불러오기
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: notesRaw } = await (supabase.from('cell_notes') as any)
        .select('*')
        .eq('cell_id', Number(id))
        .order('created_at', { ascending: false })
        .limit(50)
      if (notesRaw) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setNotes((notesRaw as any[]).map((n: any) => ({
          id: n.id,
          userId: n.user_id,
          authorName: n.author_name,
          content: n.content,
          color: n.color ?? 'yellow',
          createdAt: n.created_at,
        })))
      }

      // Realtime
      const channel = supabase.channel(`cell-room-${id}`, {
        config: { presence: { key: user.id } },
      })

      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<Member>()
        setMembers(Object.values(state).flat())
      })

      channel.on('broadcast', { event: 'chat' }, ({ payload }) => {
        setMessages((prev) => [...prev, payload as Message])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })

      // 쪽지 실시간 (broadcast)
      channel.on('broadcast', { event: 'note_add' }, ({ payload }) => {
        const n = payload as CellNote
        setNotes((prev) => [n, ...prev])
      })
      channel.on('broadcast', { event: 'note_del' }, ({ payload }) => {
        const { id: delId } = payload as { id: number }
        setNotes((prev) => prev.filter(n => n.id !== delId))
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

  const postNote = async () => {
    if (!noteInput.trim() || !myUserId || !myProfile || !channelRef.current) return
    setPostingNote(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: inserted, error } = await (supabase.from('cell_notes') as any)
        .insert({
          cell_id: Number(id),
          user_id: myUserId,
          author_name: myProfile.name,
          content: noteInput.trim(),
          color: noteColor,
        })
        .select()
        .single()

      if (error || !inserted) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ins = inserted as any
      const newNote: CellNote = {
        id: ins.id,
        userId: myUserId,
        authorName: myProfile.name,
        content: noteInput.trim(),
        color: noteColor,
        createdAt: ins.created_at,
      }
      setNotes((prev) => [newNote, ...prev])
      await channelRef.current!.send({ type: 'broadcast', event: 'note_add', payload: newNote })
      setNoteInput('')
      setIsAddingNote(false)
    } finally {
      setPostingNote(false)
    }
  }

  const deleteNote = async (noteId: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('cell_notes') as any).delete().eq('id', noteId)
    setNotes((prev) => prev.filter(n => n.id !== noteId))
    if (channelRef.current) {
      await channelRef.current.send({ type: 'broadcast', event: 'note_del', payload: { id: noteId } })
    }
  }

  // 로딩 중
  if (authorized === null) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-56px)] bg-slate-900">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] gap-4 px-4 text-center bg-slate-900">
        <span className="text-5xl">🔒</span>
        <p className="text-gray-300" style={{ wordBreak: 'keep-all' }}>
          이 순 모임방에 입장할 권한이 없습니다.<br />
          소속 순의 방에만 입장할 수 있어요.
        </p>
        <button
          onClick={() => router.push('/world/cell')}
          className="px-6 py-3 bg-amber-500 text-white rounded-full text-sm font-semibold"
        >
          목록으로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col h-[calc(100vh-56px)]"
      style={{
        background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      }}
    >
      {/* 럭셔리 배경 장식 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-0 left-0 w-full h-full opacity-5"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 40px,
              rgba(251,191,36,0.3) 40px,
              rgba(251,191,36,0.3) 41px
            )`,
          }}
        />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-indigo-700 opacity-20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-amber-700 opacity-15 blur-3xl" />
      </div>

      <div className="relative flex flex-col h-full" style={{ zIndex: 1 }}>

        {/* 상단 헤더 */}
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(251,191,36,0.2)' }}>
          <button
            onClick={() => router.push('/world/cell')}
            className="p-2 rounded-full transition-colors text-amber-400 hover:bg-amber-400/10"
            aria-label="목록으로"
          >
            ←
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-amber-100 text-sm whitespace-nowrap truncate">
              ✨ {cellName}
            </h1>
            <p className="text-xs text-amber-400/70">{members.length}명 접속 중</p>
          </div>
          {/* 접속자 미니 아바타 */}
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((m) => (
              <button
                key={m.userId}
                onClick={() => setProfileCard(profileCard?.userId === m.userId ? null : m)}
                className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-slate-700 hover:border-amber-400 transition-colors"
              >
                <AvatarPreview skinTone={m.skinTone} gender={m.gender} hairStyle={m.hairStyle} outfit={m.outfit} size={32} faceOnly />
              </button>
            ))}
            {members.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center text-[10px] text-amber-400 font-bold">
                +{members.length - 5}
              </div>
            )}
          </div>
        </div>

        {/* 탭 바 */}
        <div className="flex flex-shrink-0"
          style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(251,191,36,0.15)' }}>
          <button
            onClick={() => setTab('chat')}
            className={[
              'flex-1 py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-1.5',
              tab === 'chat'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-amber-300',
            ].join(' ')}
          >
            <span>💬</span>
            <span>채팅</span>
          </button>
          <button
            onClick={() => setTab('board')}
            className={[
              'flex-1 py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-1.5 relative',
              tab === 'board'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-amber-300',
            ].join(' ')}
          >
            <span>📌</span>
            <span>쪽지 보드</span>
            {notes.length > 0 && (
              <span className="absolute top-1.5 right-3 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                {notes.length}
              </span>
            )}
          </button>
        </div>

        {/* ── 채팅 탭 ── */}
        {tab === 'chat' && (
          <>
            {/* 채팅 메시지 영역 */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <span className="text-5xl opacity-40">💬</span>
                  <p className="text-sm text-slate-400" style={{ wordBreak: 'keep-all' }}>
                    아직 대화가 없어요. 먼저 인사를 건네보세요!
                  </p>
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.userId === myUserId
                return (
                  <div key={msg.id} className={['flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row'].join(' ')}>
                    {!isMe && (() => {
                      const sender = members.find((m) => m.userId === msg.userId)
                      return (
                        <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 mt-0.5 border border-amber-900/30">
                          {sender ? (
                            <AvatarPreview skinTone={sender.skinTone} gender={sender.gender} hairStyle={sender.hairStyle} outfit={sender.outfit} size={32} faceOnly />
                          ) : (
                            <span className="flex items-center justify-center h-full text-sm">👤</span>
                          )}
                        </div>
                      )
                    })()}
                    <div className={['flex flex-col gap-0.5 max-w-[70%]', isMe ? 'items-end' : 'items-start'].join(' ')}>
                      {!isMe && (
                        <span className="text-[10px] text-amber-400/70 px-1 whitespace-nowrap">{msg.name}</span>
                      )}
                      <div
                        className={[
                          'px-3 py-2 rounded-2xl text-sm leading-snug',
                          isMe
                            ? 'text-white rounded-tr-sm'
                            : 'rounded-tl-sm text-slate-100',
                        ].join(' ')}
                        style={isMe
                          ? { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', wordBreak: 'keep-all' }
                          : { background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(251,191,36,0.15)', wordBreak: 'keep-all' }
                        }
                      >
                        <span style={{ wordBreak: 'keep-all' }}>{msg.text}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 px-1">{msg.time}</span>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* 프로필 카드 */}
            {profileCard && (
              <div className="mx-4 mb-0 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 flex-shrink-0"
                style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(251,191,36,0.3)' }}>
                <div className="w-12 h-12 rounded-full bg-slate-700 border-2 overflow-hidden flex-shrink-0"
                  style={{ borderColor: 'rgba(251,191,36,0.5)' }}>
                  <AvatarPreview skinTone={profileCard.skinTone} gender={profileCard.gender} hairStyle={profileCard.hairStyle} outfit={profileCard.outfit} size={48} faceOnly />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-amber-100 text-sm whitespace-nowrap">{profileCard.name}</p>
                  {profileCard.titles.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {profileCard.titles.map(t => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                          style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 mt-0.5">직분 미설정</p>
                  )}
                </div>
                <button onClick={() => setProfileCard(null)} className="flex-shrink-0 text-slate-500 p-1 hover:text-amber-400" aria-label="닫기">✕</button>
              </div>
            )}

            {/* 입력창 */}
            <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0 pb-safe"
              style={{ background: 'rgba(15,23,42,0.9)', borderTop: '1px solid rgba(251,191,36,0.15)' }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                placeholder="메시지를 입력하세요..."
                maxLength={300}
                className="flex-1 rounded-full px-4 py-2.5 text-sm text-slate-100 focus:outline-none min-h-[44px] placeholder-slate-500"
                style={{ background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(251,191,36,0.2)' }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center active:scale-95 disabled:opacity-40 transition-all"
                style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}
                aria-label="전송"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white rotate-90">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </>
        )}

        {/* ── 쪽지 보드 탭 ── */}
        {tab === 'board' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 보드 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{ background: 'rgba(15,23,42,0.5)' }}>
              <div>
                <p className="text-xs text-amber-400/70">쪽지를 남겨 서로 격려해보세요 ✨</p>
              </div>
              <button
                onClick={() => setIsAddingNote(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', color: 'white' }}
              >
                <span>+</span>
                <span>쪽지 쓰기</span>
              </button>
            </div>

            {/* 쪽지 작성 폼 */}
            {isAddingNote && (
              <div className="mx-4 mb-3 p-4 rounded-2xl flex-shrink-0 shadow-2xl"
                style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(251,191,36,0.3)' }}>
                <p className="text-xs font-bold text-amber-400 mb-2">새 쪽지</p>
                <textarea
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  placeholder="마음을 담아 쪽지를 써보세요 (최대 100자)"
                  maxLength={100}
                  rows={3}
                  className="w-full rounded-xl px-3 py-2 text-sm text-slate-100 resize-none focus:outline-none placeholder-slate-500"
                  style={{ background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(251,191,36,0.15)' }}
                  autoFocus
                />
                {/* 색상 선택 */}
                <div className="flex items-center gap-2 mt-2 mb-3">
                  <span className="text-[11px] text-slate-400">색상:</span>
                  {NOTE_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setNoteColor(c.value)}
                      className={[
                        'w-6 h-6 rounded-full transition-transform',
                        c.dot,
                        noteColor === c.value ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-slate-900' : '',
                      ].join(' ')}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={postNote}
                    disabled={!noteInput.trim() || postingNote}
                    className="flex-1 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
                    style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}
                  >
                    {postingNote ? '게시 중...' : '📌 붙이기'}
                  </button>
                  <button
                    onClick={() => { setIsAddingNote(false); setNoteInput('') }}
                    className="px-4 py-2 rounded-xl text-sm text-slate-400 border border-slate-600"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {/* 보드 배경 + 쪽지들 */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {/* 코르크 보드 영역 */}
              <div className="rounded-2xl p-4 min-h-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(120,85,45,0.25) 0%, rgba(80,50,20,0.3) 100%)',
                  border: '2px solid rgba(139,90,43,0.4)',
                  boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.3)',
                }}>

                {/* 보드 상단 타이틀 */}
                <div className="flex items-center gap-2 mb-4 pb-3"
                  style={{ borderBottom: '1px solid rgba(139,90,43,0.3)' }}>
                  <span className="text-amber-500 text-lg">📋</span>
                  <span className="text-amber-300 text-sm font-bold">{cellName} 쪽지 보드</span>
                </div>

                {notes.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <span className="text-4xl opacity-30">📌</span>
                    <p className="text-sm text-slate-500" style={{ wordBreak: 'keep-all' }}>
                      아직 쪽지가 없어요.<br />첫 번째 쪽지를 남겨보세요!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {notes.map((note, idx) => {
                      const style = getNoteStyle(note.color)
                      const rotation = NOTE_ROTATIONS[idx % NOTE_ROTATIONS.length]
                      const isOwn = note.userId === myUserId
                      return (
                        <div
                          key={note.id}
                          className={[
                            'relative p-3 rounded shadow-lg transition-transform hover:scale-105',
                            style.bg, style.border, style.text,
                            rotation,
                            'border',
                          ].join(' ')}
                          style={{ minHeight: 100 }}
                        >
                          {/* 압정 */}
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 shadow-md border-2 border-red-700 z-10" />
                          {/* 내용 */}
                          <p className="text-xs leading-relaxed mt-2 font-medium" style={{ wordBreak: 'keep-all' }}>
                            {note.content}
                          </p>
                          {/* 작성자 + 시간 */}
                          <div className="flex items-center justify-between mt-2 pt-1.5"
                            style={{ borderTop: `1px solid rgba(0,0,0,0.1)` }}>
                            <span className="text-[10px] font-semibold opacity-70 whitespace-nowrap">
                              {note.authorName}
                            </span>
                            <span className="text-[9px] opacity-50">
                              {new Date(note.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          {/* 내 쪽지 삭제 버튼 */}
                          {isOwn && (
                            <button
                              onClick={() => deleteNote(note.id)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/20 text-white/60 flex items-center justify-center text-[10px] hover:bg-black/40 hover:text-white transition-colors"
                              aria-label="삭제"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
