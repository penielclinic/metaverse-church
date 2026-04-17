'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AvatarPreview from '@/components/world/AvatarPreview'
import type { SkinTone, Gender, Outfit } from '@/components/world/AvatarPreview'

// ── 새 기능 컴포넌트 ──────────────────────────────────────────
import WordBoard from '@/components/cell/word/WordBoard'
import AttendanceBoard from '@/components/cell/attendance/AttendanceBoard'
import PrayerBoard from '@/components/cell/prayer/PrayerBoard'
import NoticeBoard from '@/components/cell/notice/NoticeBoard'
import ScheduleCalendar from '@/components/cell/notice/ScheduleCalendar'
import MeetingTimer from '@/components/cell/timer/MeetingTimer'

// ── 타입 ──────────────────────────────────────────────────────
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

type MobileTab = 'word' | 'chat' | 'attendance' | 'prayer' | 'notice' | 'board'
type RightPanel = 'attendance' | 'prayer' | 'notice'

// ── 쪽지 색상 ─────────────────────────────────────────────────
const NOTE_COLORS = [
  { value: 'yellow', bg: 'bg-amber-100',   border: 'border-amber-300',   text: 'text-amber-900',   dot: 'bg-amber-400' },
  { value: 'pink',   bg: 'bg-pink-100',    border: 'border-pink-300',    text: 'text-pink-900',    dot: 'bg-pink-400' },
  { value: 'blue',   bg: 'bg-sky-100',     border: 'border-sky-300',     text: 'text-sky-900',     dot: 'bg-sky-400' },
  { value: 'green',  bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-900', dot: 'bg-emerald-400' },
  { value: 'purple', bg: 'bg-violet-100',  border: 'border-violet-300',  text: 'text-violet-900',  dot: 'bg-violet-400' },
]
const NOTE_ROTATIONS = ['-rotate-1', 'rotate-1', '-rotate-2', 'rotate-2', 'rotate-0']

function getNoteStyle(color: string) {
  return NOTE_COLORS.find(c => c.value === color) ?? NOTE_COLORS[0]
}

// ── 모바일 탭 정의 ────────────────────────────────────────────
const MOBILE_TABS: { key: MobileTab; icon: string; label: string }[] = [
  { key: 'word',       icon: '📖', label: '말씀'   },
  { key: 'chat',       icon: '💬', label: '채팅'   },
  { key: 'attendance', icon: '✅', label: '출석'   },
  { key: 'prayer',     icon: '🙏', label: '기도'   },
  { key: 'notice',     icon: '📌', label: '공지'   },
  { key: 'board',      icon: '📝', label: '쪽지'   },
]

// ── 메인 컴포넌트 ──────────────────────────────────────────────
export default function CellRoomPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const supabase = createClient()

  // ── 공통 상태 ────────────────────────────────────────────────
  const [cellName,   setCellName]   = useState('')
  const [messages,   setMessages]   = useState<Message[]>([])
  const [members,    setMembers]    = useState<Member[]>([])
  const [input,      setInput]      = useState('')
  const [myUserId,   setMyUserId]   = useState<string | null>(null)
  const [myProfile,  setMyProfile]  = useState<Member | null>(null)
  const [isLeader,   setIsLeader]   = useState(false)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [profileCard, setProfileCard] = useState<Member | null>(null)
  const [isLive,     setIsLive]     = useState(false)   // 타이머 작동 중 LIVE
  const [wordCollapsed, setWordCollapsed] = useState(false)

  // ── 탭 상태 ──────────────────────────────────────────────────
  const [mobileTab,  setMobileTab]  = useState<MobileTab>('chat')
  const [rightPanel, setRightPanel] = useState<RightPanel>('attendance')

  // ── 쪽지 상태 ────────────────────────────────────────────────
  const [notes,       setNotes]       = useState<CellNote[]>([])
  const [noteInput,   setNoteInput]   = useState('')
  const [noteColor,   setNoteColor]   = useState('yellow')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [postingNote, setPostingNote] = useState(false)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // ── 초기화 ────────────────────────────────────────────────────
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

      const ok = profile?.role === 'pastor'
        || profile?.role === 'youth_pastor'
        || Number(profile?.cell_id) === Number(id)
      setAuthorized(ok)
      if (!ok) return

      const leader = profile?.role === 'cell_leader'
        || profile?.role === 'pastor'
        || profile?.role === 'youth_pastor'
      setIsLeader(leader)

      const me: Member = {
        userId:    user.id,
        name:      profile?.name ?? '성도',
        titles:    Array.isArray(profile?.titles) ? profile!.titles! : [],
        skinTone:  (avatar?.skin_tone ?? 'medium') as SkinTone,
        gender:    (avatar?.gender ?? 'male') as Gender,
        hairStyle: avatar?.hair_style ?? 'short',
        outfit:    (avatar?.outfit ?? 'casual') as Outfit,
        level:     avatar?.level ?? 1,
      }
      setMyProfile(me)

      // 쪽지 초기 로드
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: notesRaw } = await (supabase.from('cell_notes') as any)
        .select('*')
        .eq('cell_id', Number(id))
        .order('created_at', { ascending: false })
        .limit(50)
      if (notesRaw) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setNotes((notesRaw as any[]).map((n: any) => ({
          id: n.id, userId: n.user_id, authorName: n.author_name,
          content: n.content, color: n.color ?? 'yellow', createdAt: n.created_at,
        })))
      }

      // ── Realtime 채널 (Presence + 채팅 + 쪽지 + 타이머 LIVE) ──
      const channel = supabase.channel(`cell-room-${id}`, {
        config: { presence: { key: user.id } },
      })

      channel.on('presence', { event: 'sync' }, () => {
        setMembers(Object.values(channel.presenceState<Member>()).flat())
      })

      channel.on('broadcast', { event: 'chat' }, ({ payload }) => {
        setMessages(prev => [...prev, payload as Message])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })

      channel.on('broadcast', { event: 'note_add' }, ({ payload }) => {
        setNotes(prev => [payload as CellNote, ...prev])
      })
      channel.on('broadcast', { event: 'note_del' }, ({ payload }) => {
        const { id: delId } = payload as { id: number }
        setNotes(prev => prev.filter(n => n.id !== delId))
      })

      // 타이머 LIVE 상태 수신 (MeetingTimer가 같은 채널에 브로드캐스트)
      channel.on('broadcast', { event: 'timer' }, ({ payload }) => {
        const p = payload as { running?: boolean }
        setIsLive(!!p.running)
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

  // ── 채팅 전송 ────────────────────────────────────────────────
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
    setMessages(prev => [...prev, msg])
    setInput('')
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  // ── 쪽지 등록 ────────────────────────────────────────────────
  const postNote = async () => {
    if (!noteInput.trim() || !myUserId || !myProfile || !channelRef.current) return
    setPostingNote(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: inserted, error } = await (supabase.from('cell_notes') as any)
        .insert({ cell_id: Number(id), user_id: myUserId, author_name: myProfile.name, content: noteInput.trim(), color: noteColor })
        .select().single()
      if (error || !inserted) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ins = inserted as any
      const newNote: CellNote = { id: ins.id, userId: myUserId, authorName: myProfile.name, content: noteInput.trim(), color: noteColor, createdAt: ins.created_at }
      setNotes(prev => [newNote, ...prev])
      await channelRef.current!.send({ type: 'broadcast', event: 'note_add', payload: newNote })
      setNoteInput('')
      setIsAddingNote(false)
    } finally {
      setPostingNote(false)
    }
  }

  // ── 쪽지 삭제 ────────────────────────────────────────────────
  const deleteNote = async (noteId: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('cell_notes') as any).delete().eq('id', noteId)
    setNotes(prev => prev.filter(n => n.id !== noteId))
    channelRef.current?.send({ type: 'broadcast', event: 'note_del', payload: { id: noteId } })
  }

  // ── 로딩 / 권한 없음 ─────────────────────────────────────────
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
        <button onClick={() => router.push('/world/cell')} className="px-6 py-3 bg-amber-500 text-white rounded-full text-sm font-semibold">
          목록으로 돌아가기
        </button>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────
  // 채팅 패널 (공통 — PC 왼쪽 / 모바일 채팅 탭)
  // ────────────────────────────────────────────────────────────
  const ChatPanel = (
    <div className="flex flex-col h-full">
      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="text-5xl opacity-40">💬</span>
            <p className="text-sm text-slate-400" style={{ wordBreak: 'keep-all' }}>아직 대화가 없어요. 먼저 인사를 건네보세요!</p>
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.userId === myUserId
          const sender = members.find(m => m.userId === msg.userId)
          return (
            <div key={msg.id} className={['flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row'].join(' ')}>
              {!isMe && (
                <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 mt-0.5 border border-amber-900/30">
                  {sender
                    ? <AvatarPreview skinTone={sender.skinTone} gender={sender.gender} hairStyle={sender.hairStyle} outfit={sender.outfit} size={32} faceOnly />
                    : <span className="flex items-center justify-center h-full text-sm">👤</span>
                  }
                </div>
              )}
              <div className={['flex flex-col gap-0.5 max-w-[70%]', isMe ? 'items-end' : 'items-start'].join(' ')}>
                {!isMe && <span className="text-[10px] text-amber-400/70 px-1 whitespace-nowrap">{msg.name}</span>}
                <div
                  className={['px-3 py-2 rounded-2xl text-sm leading-snug', isMe ? 'rounded-tr-sm text-white' : 'rounded-tl-sm text-slate-100'].join(' ')}
                  style={isMe
                    ? { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', wordBreak: 'keep-all' }
                    : { background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(251,191,36,0.15)', wordBreak: 'keep-all' }
                  }
                >
                  {msg.text}
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
          <div className="w-12 h-12 rounded-full bg-slate-700 border-2 overflow-hidden flex-shrink-0" style={{ borderColor: 'rgba(251,191,36,0.5)' }}>
            <AvatarPreview skinTone={profileCard.skinTone} gender={profileCard.gender} hairStyle={profileCard.hairStyle} outfit={profileCard.outfit} size={48} faceOnly />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-amber-100 text-sm whitespace-nowrap">{profileCard.name}</p>
            {profileCard.titles.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {profileCard.titles.map(t => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>{t}</span>
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
      <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
        style={{ background: 'rgba(15,23,42,0.9)', borderTop: '1px solid rgba(251,191,36,0.15)' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
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
    </div>
  )

  // ────────────────────────────────────────────────────────────
  // 쪽지 보드 패널 (공통)
  // ────────────────────────────────────────────────────────────
  const BoardPanel = (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background: 'rgba(15,23,42,0.5)' }}>
        <p className="text-xs text-amber-400/70">쪽지를 남겨 서로 격려해보세요 ✨</p>
        <button
          onClick={() => setIsAddingNote(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', color: 'white' }}
        >
          + 쪽지 쓰기
        </button>
      </div>

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
          <div className="flex items-center gap-2 mt-2 mb-3">
            <span className="text-[11px] text-slate-400">색상:</span>
            {NOTE_COLORS.map(c => (
              <button key={c.value} onClick={() => setNoteColor(c.value)}
                className={['w-6 h-6 rounded-full transition-transform', c.dot, noteColor === c.value ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''].join(' ')} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={postNote} disabled={!noteInput.trim() || postingNote}
              className="flex-1 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
              {postingNote ? '게시 중...' : '📌 붙이기'}
            </button>
            <button onClick={() => { setIsAddingNote(false); setNoteInput('') }} className="px-4 py-2 rounded-xl text-sm text-slate-400 border border-slate-600">취소</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="rounded-2xl p-4 min-h-full"
          style={{ background: 'linear-gradient(135deg, rgba(120,85,45,0.25) 0%, rgba(80,50,20,0.3) 100%)', border: '2px solid rgba(139,90,43,0.4)', boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.3)' }}>
          <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid rgba(139,90,43,0.3)' }}>
            <span className="text-amber-500 text-lg">📋</span>
            <span className="text-amber-300 text-sm font-bold">{cellName} 쪽지 보드</span>
          </div>
          {notes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="text-4xl opacity-30">📌</span>
              <p className="text-sm text-slate-500" style={{ wordBreak: 'keep-all' }}>아직 쪽지가 없어요.<br />첫 번째 쪽지를 남겨보세요!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {notes.map((note, idx) => {
                const style    = getNoteStyle(note.color)
                const rotation = NOTE_ROTATIONS[idx % NOTE_ROTATIONS.length]
                const isOwn    = note.userId === myUserId
                return (
                  <div key={note.id}
                    className={['relative p-3 rounded shadow-lg transition-transform hover:scale-105 border', style.bg, style.border, style.text, rotation].join(' ')}
                    style={{ minHeight: 100 }}>
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 shadow-md border-2 border-red-700 z-10" />
                    <p className="text-xs leading-relaxed mt-2 font-medium" style={{ wordBreak: 'keep-all' }}>{note.content}</p>
                    <div className="flex items-center justify-between mt-2 pt-1.5" style={{ borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                      <span className="text-[10px] font-semibold opacity-70 whitespace-nowrap">{note.authorName}</span>
                      <span className="text-[9px] opacity-50">{new Date(note.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    {isOwn && (
                      <button onClick={() => deleteNote(note.id)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/20 text-white/60 flex items-center justify-center text-[10px] hover:bg-black/40 transition-colors"
                        aria-label="삭제">✕</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ────────────────────────────────────────────────────────────
  // 메인 렌더
  // ────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-[calc(100vh-56px)]"
      style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}
    >
      {/* 배경 장식 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-0 left-0 w-full h-full opacity-5"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(251,191,36,0.3) 40px, rgba(251,191,36,0.3) 41px)' }} />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-indigo-700 opacity-20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-amber-700 opacity-15 blur-3xl" />
      </div>

      <div className="relative flex flex-col h-full" style={{ zIndex: 1 }}>

        {/* ── 상단 헤더 ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(251,191,36,0.2)' }}>
          <button onClick={() => router.push('/world/cell')}
            className="p-2 rounded-full text-amber-400 hover:bg-amber-400/10 transition-colors" aria-label="목록으로">←</button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-amber-100 text-sm truncate">✨ {cellName}</h1>
              {/* 🔴 LIVE 뱃지 */}
              {isLive && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold animate-pulse flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                  LIVE
                </span>
              )}
            </div>
            <p className="text-xs text-amber-400/70">{members.length}명 접속 중</p>
          </div>

          {/* 접속자 미니 아바타 */}
          <div className="flex -space-x-2">
            {members.slice(0, 5).map(m => (
              <button key={m.userId}
                onClick={() => setProfileCard(profileCard?.userId === m.userId ? null : m)}
                className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-slate-700 hover:border-amber-400 transition-colors">
                <AvatarPreview skinTone={m.skinTone} gender={m.gender} hairStyle={m.hairStyle} outfit={m.outfit} size={32} faceOnly />
              </button>
            ))}
            {members.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center text-[10px] text-amber-400 font-bold">
                +{members.length - 5}
              </div>
            )}
          </div>

          {/* 순장 관리 뱃지 */}
          {isLeader && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
              style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)' }}>
              순장
            </span>
          )}
        </div>

        {/* ── WordBoard (상단 고정, 접기 가능) ─────────────────── */}
        <div className="flex-shrink-0" style={{ borderBottom: '1px solid rgba(251,191,36,0.15)' }}>
          <button
            onClick={() => setWordCollapsed(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-amber-400/70 hover:text-amber-300 transition-colors"
            style={{ background: 'rgba(15,23,42,0.6)' }}
          >
            <span className="flex items-center gap-1.5 font-semibold">
              <span>📖</span> 오늘의 말씀 &amp; 나눔 질문
              {isLeader && <span className="text-amber-500">(순장 편집 가능)</span>}
            </span>
            <span>{wordCollapsed ? '▼' : '▲'}</span>
          </button>
          {!wordCollapsed && (
            <div className="px-4 pb-3" style={{ background: 'rgba(15,23,42,0.4)' }}>
              <WordBoard cellId={Number(id)} isLeader={isLeader} />
            </div>
          )}
        </div>

        {/* ── 중단 — PC: 좌우 분할 / 모바일: 탭 ───────────────── */}
        <div className="flex-1 flex overflow-hidden">

          {/* ══ PC 레이아웃 (lg 이상) ══════════════════════════ */}
          {/* 왼쪽: 채팅 */}
          <div className="hidden lg:flex lg:flex-col lg:w-1/2 overflow-hidden" style={{ borderRight: '1px solid rgba(251,191,36,0.1)' }}>
            {ChatPanel}
          </div>

          {/* 오른쪽: 출석 / 기도 / 공지 패널 */}
          <div className="hidden lg:flex lg:flex-col lg:flex-1 overflow-hidden">
            {/* 우측 탭 헤더 */}
            <div className="flex flex-shrink-0" style={{ background: 'rgba(15,23,42,0.7)', borderBottom: '1px solid rgba(251,191,36,0.1)' }}>
              {([
                { key: 'attendance', icon: '✅', label: '출석' },
                { key: 'prayer',     icon: '🙏', label: '기도제목' },
                { key: 'notice',     icon: '📌', label: '공지/일정' },
              ] as { key: RightPanel; icon: string; label: string }[]).map(t => (
                <button key={t.key} onClick={() => setRightPanel(t.key)}
                  className={['flex-1 py-2.5 text-xs font-semibold transition-all flex items-center justify-center gap-1',
                    rightPanel === t.key ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400 hover:text-amber-300'].join(' ')}>
                  <span>{t.icon}</span><span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* 우측 패널 컨텐츠 */}
            <div className="flex-1 overflow-y-auto p-3">
              {rightPanel === 'attendance' && myUserId && (
                <AttendanceBoard cellId={Number(id)} />
              )}
              {rightPanel === 'prayer' && myUserId && (
                <PrayerBoard cellId={Number(id)} myUserId={myUserId} />
              )}
              {rightPanel === 'notice' && (
                <div className="space-y-4">
                  <NoticeBoard cellId={id} isLeader={isLeader} />
                  <ScheduleCalendar cellId={id} isLeader={isLeader} />
                </div>
              )}
            </div>
          </div>

          {/* ══ 모바일 레이아웃 (lg 미만) ══════════════════════ */}
          <div className="flex lg:hidden flex-col flex-1 overflow-hidden">
            {/* 모바일 탭 바 */}
            <div className="flex flex-shrink-0 overflow-x-auto scrollbar-hide"
              style={{ background: 'rgba(15,23,42,0.7)', borderBottom: '1px solid rgba(251,191,36,0.15)' }}>
              {MOBILE_TABS.map(t => (
                <button key={t.key} onClick={() => setMobileTab(t.key)}
                  className={['flex-shrink-0 flex flex-col items-center justify-center px-4 py-2 text-[10px] font-semibold transition-all relative',
                    mobileTab === t.key ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400'].join(' ')}>
                  <span className="text-base leading-none">{t.icon}</span>
                  <span className="mt-0.5 whitespace-nowrap">{t.label}</span>
                  {t.key === 'board' && notes.length > 0 && (
                    <span className="absolute top-1 right-1 min-w-[14px] h-3.5 px-1 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center">
                      {notes.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* 모바일 탭 컨텐츠 */}
            <div className="flex-1 overflow-y-auto">
              {mobileTab === 'word' && (
                <div className="p-3">
                  <WordBoard cellId={Number(id)} isLeader={isLeader} />
                </div>
              )}
              {mobileTab === 'chat' && (
                <div className="flex flex-col h-full">{ChatPanel}</div>
              )}
              {mobileTab === 'attendance' && myUserId && (
                <div className="p-3">
                  <AttendanceBoard cellId={Number(id)} />
                </div>
              )}
              {mobileTab === 'prayer' && myUserId && (
                <div className="p-3">
                  <PrayerBoard cellId={Number(id)} myUserId={myUserId} />
                </div>
              )}
              {mobileTab === 'notice' && (
                <div className="p-3 space-y-4">
                  <NoticeBoard cellId={id} isLeader={isLeader} />
                  <ScheduleCalendar cellId={id} isLeader={isLeader} />
                </div>
              )}
              {mobileTab === 'board' && (
                <div className="flex flex-col h-full">{BoardPanel}</div>
              )}
            </div>
          </div>
        </div>

        {/* ── 하단 고정 — 타이머 + 쪽지보드 (PC) ─────────────── */}
        <div className="flex-shrink-0" style={{ borderTop: '1px solid rgba(251,191,36,0.15)', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)' }}>
          {/* 모임 타이머 (순장 전용 — 모든 사람에게 표시, 컨트롤만 순장) */}
          <div className="px-4 pt-3 pb-1">
            <MeetingTimer cellId={id} isLeader={isLeader} />
          </div>

          {/* PC에서 쪽지보드를 하단 탭으로 표시 */}
          <div className="hidden lg:block">
            <details className="group">
              <summary className="flex items-center gap-2 px-4 py-2 cursor-pointer list-none text-xs text-amber-400/70 hover:text-amber-300 select-none">
                <span className="text-base">📝</span>
                <span className="font-semibold">쪽지 보드</span>
                {notes.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-600 text-white text-[9px] font-bold">{notes.length}</span>
                )}
                <span className="ml-auto group-open:rotate-180 transition-transform">▲</span>
              </summary>
              <div className="max-h-72 overflow-hidden border-t" style={{ borderColor: 'rgba(251,191,36,0.1)' }}>
                {BoardPanel}
              </div>
            </details>
          </div>
        </div>

      </div>
    </div>
  )
}
