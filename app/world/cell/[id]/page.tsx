'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AvatarPreview from '@/components/world/AvatarPreview'
import type { SkinTone, Gender, Outfit } from '@/components/world/AvatarPreview'
import WordBoard from '@/components/cell/word/WordBoard'
import AttendanceBoard from '@/components/cell/attendance/AttendanceBoard'
import PrayerBoard from '@/components/cell/prayer/PrayerBoard'
import NoticeBoard from '@/components/cell/notice/NoticeBoard'
import ScheduleCalendar from '@/components/cell/notice/ScheduleCalendar'
import MeetingTimer from '@/components/cell/timer/MeetingTimer'
import MVPVote from '@/components/cell/mvp/MVPVote'
import CellAlbum from '@/components/cell/album/CellAlbum'

// ── 타입 ──────────────────────────────────────────────────────
interface Message {
  id: string; userId: string; name: string; text: string; time: string
}
interface Member {
  userId: string; name: string; titles: string[]
  skinTone: SkinTone; gender: Gender; hairStyle: string; outfit: Outfit; level: number
}
interface CellNote {
  id: number; userId: string; authorName: string; content: string; color: string; createdAt: string
}
type DrawerKey = 'word' | 'chat' | 'attendance' | 'prayer' | 'notice' | 'board' | 'timer' | 'mvp' | 'album'

// ── 쪽지 스타일 ───────────────────────────────────────────────
const NOTE_COLORS = [
  { value: 'yellow', bg: 'bg-amber-100',   border: 'border-amber-300',   text: 'text-amber-900',   dot: 'bg-amber-400' },
  { value: 'pink',   bg: 'bg-pink-100',    border: 'border-pink-300',    text: 'text-pink-900',    dot: 'bg-pink-400' },
  { value: 'blue',   bg: 'bg-sky-100',     border: 'border-sky-300',     text: 'text-sky-900',     dot: 'bg-sky-400' },
  { value: 'green',  bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-900', dot: 'bg-emerald-400' },
  { value: 'purple', bg: 'bg-violet-100',  border: 'border-violet-300',  text: 'text-violet-900',  dot: 'bg-violet-400' },
]
const NOTE_ROTATIONS = ['-rotate-1', 'rotate-1', '-rotate-2', 'rotate-2', 'rotate-0']
const getNoteStyle = (color: string) => NOTE_COLORS.find(c => c.value === color) ?? NOTE_COLORS[0]

// ── 채팅 입력창 ────────────────────────────────────────────────
// - ref 기반 비제어 입력: 부모 리렌더가 입력값에 영향 없음
// - userSelect: 'text' : 부모 select-none이 iOS 키보드 입력 차단하는 버그 방지
function ChatInput({ onSend }: { onSend: (text: string) => void }) {
  const inputRef  = useRef<HTMLInputElement>(null)
  const [hasText, setHasText] = useState(false)

  const handleSend = () => {
    const text = inputRef.current?.value.trim() ?? ''
    if (!text) return
    onSend(text)
    if (inputRef.current) { inputRef.current.value = ''; setHasText(false) }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
      style={{ background: 'rgba(15,23,42,0.95)', borderTop: '1px solid rgba(251,191,36,0.12)' }}>
      <input
        ref={inputRef}
        type="text"
        defaultValue=""
        onChange={e => setHasText(e.target.value.trim().length > 0)}
        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
        placeholder="메시지를 입력하세요..." maxLength={300}
        className="flex-1 rounded-full px-4 py-2.5 text-sm text-slate-100 focus:outline-none min-h-[44px] placeholder-slate-500"
        style={{
          background: 'rgba(30,27,75,0.8)',
          border: '1px solid rgba(251,191,36,0.2)',
          userSelect: 'text',
          WebkitUserSelect: 'text',
        }}
      />
      <button onClick={handleSend} disabled={!hasText}
        className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center active:scale-95 disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg,#d97706,#b45309)' }}>
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white rotate-90">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
  )
}

// ── 보드 판 정의 ──────────────────────────────────────────────
const BOARDS: { key: DrawerKey; icon: string; label: string; accent: string; glow: string }[] = [
  { key: 'word',       icon: '📖', label: '오늘의\n말씀',  accent: '#C9A227', glow: 'rgba(201,162,39,0.35)' },
  { key: 'chat',       icon: '💬', label: '대화방',        accent: '#60A5FA', glow: 'rgba(96,165,250,0.35)' },
  { key: 'attendance', icon: '✅', label: '출석\n체크',    accent: '#34D399', glow: 'rgba(52,211,153,0.35)' },
  { key: 'prayer',     icon: '🙏', label: '기도\n제목',    accent: '#C084FC', glow: 'rgba(192,132,252,0.35)' },
  { key: 'notice',     icon: '📌', label: '공지\n일정',    accent: '#FB923C', glow: 'rgba(251,146,60,0.35)'  },
  { key: 'board',      icon: '📝', label: '쪽지\n보드',    accent: '#F472B6', glow: 'rgba(244,114,182,0.35)' },
  { key: 'timer',      icon: '⏱️', label: '모임\n타이머',  accent: '#818CF8', glow: 'rgba(129,140,248,0.35)' },
  { key: 'mvp',        icon: '👑', label: 'MVP\n투표',     accent: '#FBBF24', glow: 'rgba(251,191,36,0.35)'  },
  { key: 'album',      icon: '📷', label: '셀\n앨범',      accent: '#2DD4BF', glow: 'rgba(45,212,191,0.35)'  },
]

export default function CellRoomPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const supabase = createClient()

  const [cellName,    setCellName]    = useState('')
  const [messages,    setMessages]    = useState<Message[]>([])
  const [members,     setMembers]     = useState<Member[]>([])
  const [myUserId,    setMyUserId]    = useState<string | null>(null)
  const [myProfile,   setMyProfile]   = useState<Member | null>(null)
  const [isLeader,    setIsLeader]    = useState(false)
  const [authorized,  setAuthorized]  = useState<boolean | null>(null)
  const [profileCard, setProfileCard] = useState<Member | null>(null)
  const [isLive,      setIsLive]      = useState(false)
  const [activeDrawer,setActiveDrawer]= useState<DrawerKey | null>(null)
  const [newMsgCount, setNewMsgCount] = useState(0)
  const [notes,       setNotes]       = useState<CellNote[]>([])
  const [noteInput,   setNoteInput]   = useState('')
  const [noteColor,   setNoteColor]   = useState('yellow')
  const [isAddingNote,setIsAddingNote]= useState(false)
  const [postingNote, setPostingNote] = useState(false)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // ── 초기화 ────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyUserId(user.id)

      const { data: cell } = await supabase.from('cells').select('name').eq('id', Number(id)).single()
      setCellName(cell?.name ?? `순 ${id}`)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profileRaw } = await (supabase.from('profiles') as any)
        .select('name, role, cell_id, titles').eq('id', user.id).single()
      const profile = profileRaw as { name?: string; role?: string; cell_id?: number; titles?: string[] } | null

      const { data: avatarRaw } = await supabase
        .from('avatars').select('skin_tone, gender, hair_style, outfit, level').eq('user_id', user.id).single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const avatar = avatarRaw as any

      const ok = profile?.role === 'pastor' || profile?.role === 'youth_pastor' || Number(profile?.cell_id) === Number(id)
      setAuthorized(ok)
      if (!ok) return

      setIsLeader(profile?.role === 'cell_leader' || profile?.role === 'pastor' || profile?.role === 'youth_pastor')

      const me: Member = {
        userId: user.id, name: profile?.name ?? '성도',
        titles: Array.isArray(profile?.titles) ? profile!.titles! : [],
        skinTone: (avatar?.skin_tone ?? 'medium') as SkinTone,
        gender: (avatar?.gender ?? 'male') as Gender,
        hairStyle: avatar?.hair_style ?? 'short',
        outfit: (avatar?.outfit ?? 'casual') as Outfit,
        level: avatar?.level ?? 1,
      }
      setMyProfile(me)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: notesRaw } = await (supabase.from('cell_notes') as any)
        .select('*').eq('cell_id', Number(id)).order('created_at', { ascending: false }).limit(50)
      if (notesRaw) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setNotes((notesRaw as any[]).map((n: any) => ({
          id: n.id, userId: n.user_id, authorName: n.author_name,
          content: n.content, color: n.color ?? 'yellow', createdAt: n.created_at,
        })))
      }

      const channel = supabase.channel(`cell-room-${id}`, { config: { presence: { key: user.id } } })

      channel.on('presence', { event: 'sync' }, () => {
        setMembers(Object.values(channel.presenceState<Member>()).flat())
      })
      channel.on('broadcast', { event: 'chat' }, ({ payload }) => {
        setMessages(prev => [...prev, payload as Message])
        setNewMsgCount(c => c + 1)
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })
      channel.on('broadcast', { event: 'note_add' }, ({ payload }) => setNotes(prev => [payload as CellNote, ...prev]))
      channel.on('broadcast', { event: 'note_del' }, ({ payload }) => {
        const { id: delId } = payload as { id: number }
        setNotes(prev => prev.filter(n => n.id !== delId))
      })
      channel.on('broadcast', { event: 'timer' }, ({ payload }) => {
        setIsLive(!!(payload as { running?: boolean }).running)
      })

      await channel.subscribe()
      await channel.track(me)
      channelRef.current = channel
    }

    init()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const sendMessage = useCallback(async (text: string) => {
    if (!myUserId || !myProfile || !channelRef.current) return
    const msg: Message = {
      id: `${Date.now()}-${myUserId}`, userId: myUserId, name: myProfile.name, text,
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    }
    await channelRef.current.send({ type: 'broadcast', event: 'chat', payload: msg })
    setMessages(prev => [...prev, msg])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUserId, myProfile])

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
      setNoteInput(''); setIsAddingNote(false)
    } finally { setPostingNote(false) }
  }

  const deleteNote = async (noteId: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('cell_notes') as any).delete().eq('id', noteId)
    setNotes(prev => prev.filter(n => n.id !== noteId))
    channelRef.current?.send({ type: 'broadcast', event: 'note_del', payload: { id: noteId } })
  }

  const openDrawer = (key: DrawerKey) => {
    setActiveDrawer(key)
    if (key === 'chat') setNewMsgCount(0)
  }

  // ── 로딩 / 권한 ──────────────────────────────────────────────
  if (authorized === null) {
    return (
      <div className="flex justify-center items-center h-screen"
        style={{ background: 'linear-gradient(180deg,#0a0603,#1a0e07 40%,#8b5e3c)' }}>
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 px-4 text-center"
        style={{ background: 'linear-gradient(180deg,#0a0603,#1a0e07)' }}>
        <span className="text-5xl">🔒</span>
        <p className="text-gray-300" style={{ wordBreak: 'keep-all' }}>이 순 모임방에 입장 권한이 없습니다.</p>
        <button onClick={() => router.push('/world/cell')} className="px-6 py-3 bg-amber-500 text-white rounded-full text-sm font-semibold">
          목록으로 돌아가기
        </button>
      </div>
    )
  }

  // ── 드로어 컨텐츠 ─────────────────────────────────────────────
  const DrawerContent = () => {
    if (!myUserId) return null
    switch (activeDrawer) {
      case 'word':
        return <div className="p-4"><WordBoard cellId={Number(id)} isLeader={isLeader} /></div>

      case 'chat':
        return (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <span className="text-5xl opacity-30">💬</span>
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
                        {sender ? <AvatarPreview skinTone={sender.skinTone} gender={sender.gender} hairStyle={sender.hairStyle} outfit={sender.outfit} size={32} faceOnly /> : <span className="flex items-center justify-center h-full text-sm">👤</span>}
                      </div>
                    )}
                    <div className={['flex flex-col gap-0.5 max-w-[72%]', isMe ? 'items-end' : 'items-start'].join(' ')}>
                      {!isMe && <span className="text-[10px] text-amber-400/70 px-1 whitespace-nowrap">{msg.name}</span>}
                      <div className={['px-3 py-2 rounded-2xl text-sm leading-snug', isMe ? 'rounded-tr-sm text-white' : 'rounded-tl-sm text-slate-100'].join(' ')}
                        style={isMe
                          ? { background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', wordBreak: 'keep-all' }
                          : { background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(251,191,36,0.15)', wordBreak: 'keep-all' }
                        }
                      >{msg.text}</div>
                      <span className="text-[10px] text-slate-500 px-1">{msg.time}</span>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
            <ChatInput onSend={sendMessage} />
          </div>
        )

      case 'attendance':
        return <div className="p-4"><AttendanceBoard cellId={Number(id)} /></div>

      case 'prayer':
        return <div className="p-4"><PrayerBoard cellId={Number(id)} myUserId={myUserId} /></div>

      case 'notice':
        return <div className="p-4 space-y-4"><NoticeBoard cellId={id} isLeader={isLeader} /><ScheduleCalendar cellId={id} isLeader={isLeader} /></div>

      case 'timer':
        return <div className="p-4"><MeetingTimer cellId={id} isLeader={isLeader} /></div>

      case 'mvp':
        return <div className="p-4"><MVPVote cellId={Number(id)} myUserId={myUserId} isLeader={isLeader} /></div>

      case 'album':
        return <div className="p-4"><CellAlbum cellId={Number(id)} myUserId={myUserId} isLeader={isLeader} /></div>

      case 'board':
        return (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{ background: 'rgba(15,23,42,0.5)' }}>
              <p className="text-xs text-amber-400/70">쪽지를 남겨 서로 격려해보세요 ✨</p>
              <button onClick={() => setIsAddingNote(true)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold active:scale-95"
                style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', color: 'white' }}>
                + 쪽지 쓰기
              </button>
            </div>
            {isAddingNote && (
              <div className="mx-4 mb-3 p-4 rounded-2xl flex-shrink-0 shadow-2xl"
                style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(251,191,36,0.3)' }}>
                <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)}
                  placeholder="마음을 담아 쪽지를 써보세요 (최대 100자)" maxLength={100} rows={3}
                  className="w-full rounded-xl px-3 py-2 text-sm text-slate-100 resize-none focus:outline-none placeholder-slate-500"
                  style={{ background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(251,191,36,0.15)' }} autoFocus />
                <div className="flex items-center gap-2 mt-2 mb-3">
                  {NOTE_COLORS.map(c => (
                    <button key={c.value} onClick={() => setNoteColor(c.value)}
                      className={['w-6 h-6 rounded-full transition-transform', c.dot, noteColor === c.value ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''].join(' ')} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={postNote} disabled={!noteInput.trim() || postingNote}
                    className="flex-1 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#d97706,#b45309)' }}>
                    {postingNote ? '게시 중...' : '📌 붙이기'}
                  </button>
                  <button onClick={() => { setIsAddingNote(false); setNoteInput('') }}
                    className="px-4 py-2 rounded-xl text-sm text-slate-400 border border-slate-600">취소</button>
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <div className="rounded-2xl p-4 min-h-full"
                style={{ background: 'linear-gradient(135deg,rgba(120,85,45,0.25),rgba(80,50,20,0.3))', border: '2px solid rgba(139,90,43,0.4)', boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.3)' }}>
                <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid rgba(139,90,43,0.3)' }}>
                  <span className="text-amber-500 text-lg">📋</span>
                  <span className="text-amber-300 text-sm font-bold">{cellName} 쪽지 보드</span>
                </div>
                {notes.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <span className="text-4xl opacity-30">📌</span>
                    <p className="text-sm text-slate-500" style={{ wordBreak: 'keep-all' }}>아직 쪽지가 없어요.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {notes.map((note, idx) => {
                      const style = getNoteStyle(note.color)
                      const rotation = NOTE_ROTATIONS[idx % NOTE_ROTATIONS.length]
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
                          {note.userId === myUserId && (
                            <button onClick={() => deleteNote(note.id)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/20 text-white/60 flex items-center justify-center text-[10px] hover:bg-black/40"
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
      default: return null
    }
  }

  const activeBoard = BOARDS.find(b => b.key === activeDrawer)

  // ── 메인 렌더 ─────────────────────────────────────────────────
  return (
    <div className="relative overflow-hidden select-none" style={{ height: 'calc(100vh - 56px)' }}>

      {/* ══ 럭셔리 응접실 배경 ══════════════════════════════════ */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        {/* 천장 */}
        <div className="absolute top-0 left-0 right-0"
          style={{ height: '13%', background: 'linear-gradient(180deg,#060302 0%,#1a0e07 100%)' }} />
        {/* 천장 샹들리에 빛 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2"
          style={{ width: '70%', height: '55%', background: 'radial-gradient(ellipse at 50% 0%,rgba(255,210,110,0.22) 0%,rgba(255,180,60,0.06) 45%,transparent 70%)' }} />
        {/* 뒷벽 */}
        <div className="absolute left-0 right-0"
          style={{ top: '13%', bottom: '20%', background: 'linear-gradient(180deg,#6b3d1a 0%,#a8703a 20%,#c9956a 45%,#d4a574 65%,#b8845a 85%,#8b5e3c 100%)' }} />
        {/* 벽 나뭇결 세로줄 */}
        <div className="absolute left-0 right-0" style={{ top: '13%', bottom: '20%', opacity: 0.05,
          backgroundImage: 'repeating-linear-gradient(90deg,transparent,transparent 55px,rgba(0,0,0,0.8) 56px)',
          backgroundSize: '56px 100%' }} />
        {/* 걸레받이 */}
        <div className="absolute left-0 right-0"
          style={{ bottom: '20%', height: '2.5%', background: 'linear-gradient(180deg,#4a2810,#2a1608)' }} />
        {/* 바닥 */}
        <div className="absolute bottom-0 left-0 right-0"
          style={{ height: '20%', background: 'linear-gradient(180deg,#3a1e08 0%,#1e0f04 60%,#0d0602 100%)' }} />
        {/* 바닥 마루 패턴 */}
        <div className="absolute bottom-0 left-0 right-0" style={{ height: '20%', opacity: 0.12,
          backgroundImage: 'repeating-linear-gradient(90deg,transparent,transparent 35px,rgba(255,255,255,0.4) 36px)',
          backgroundSize: '36px 100%' }} />
        {/* 왼쪽 측벽 */}
        <div className="absolute left-0" style={{ top: '13%', bottom: '20%', width: '13%',
          background: 'linear-gradient(to right,#1a0a04,#7a4d22)',
          clipPath: 'polygon(0 0,100% 12%,100% 88%,0 100%)' }} />
        {/* 오른쪽 측벽 */}
        <div className="absolute right-0" style={{ top: '13%', bottom: '20%', width: '13%',
          background: 'linear-gradient(to left,#1a0a04,#7a4d22)',
          clipPath: 'polygon(0 12%,100% 0,100% 100%,0 88%)' }} />
        {/* 천장-벽 경계선 */}
        <div className="absolute left-0 right-0" style={{ top: '13%', height: '1px',
          background: 'linear-gradient(90deg,transparent 4%,rgba(210,170,90,0.5) 12%,rgba(230,190,100,0.85) 50%,rgba(210,170,90,0.5) 88%,transparent 96%)' }} />
        {/* 벽-바닥 경계선 */}
        <div className="absolute left-0 right-0" style={{ bottom: '22.5%', height: '1px',
          background: 'linear-gradient(90deg,transparent 4%,rgba(180,130,70,0.4) 12%,rgba(200,150,80,0.7) 50%,rgba(180,130,70,0.4) 88%,transparent 96%)' }} />
        {/* 전체 비네팅 */}
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 85% 75% at 50% 42%,transparent 35%,rgba(0,0,0,0.7) 100%)' }} />
      </div>

      {/* ══ 상단 헤더 ══════════════════════════════════════════ */}
      <div className="absolute top-0 left-0 right-0 flex items-center gap-3 px-4 py-3"
        style={{ zIndex: 10, background: 'rgba(8,4,2,0.8)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(200,160,80,0.18)' }}>
        <button onClick={() => router.push('/world/cell')}
          className="w-9 h-9 flex items-center justify-center rounded-full text-amber-400 hover:bg-amber-400/10 transition-colors text-lg flex-shrink-0"
          aria-label="뒤로">←</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-amber-100 text-sm truncate">✨ {cellName}</h1>
            {isLive && (
              <span className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-600/90 text-white text-[9px] font-bold animate-pulse">
                <span className="w-1 h-1 rounded-full bg-white" />LIVE
              </span>
            )}
          </div>
          <p className="text-[11px] text-amber-400/60">{members.length}명 접속 중</p>
        </div>
        {/* 접속자 미니 아바타 */}
        <div className="flex -space-x-2">
          {members.slice(0, 4).map(m => (
            <button key={m.userId}
              onClick={() => setProfileCard(profileCard?.userId === m.userId ? null : m)}
              className="w-8 h-8 rounded-full overflow-hidden border-2 border-slate-800 hover:border-amber-400 transition-colors flex-shrink-0">
              <AvatarPreview skinTone={m.skinTone} gender={m.gender} hairStyle={m.hairStyle} outfit={m.outfit} size={32} faceOnly />
            </button>
          ))}
          {members.length > 4 && (
            <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-[9px] text-amber-400 font-bold">
              +{members.length - 4}
            </div>
          )}
        </div>
        {isLeader && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
            style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.35)' }}>순장</span>
        )}
      </div>

      {/* ══ 보드 그리드 (벽에 걸린 보드판들) ══════════════════ */}
      <div className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ zIndex: 5, paddingTop: '64px', paddingBottom: '16px' }}>

        {/* 벽 중앙 — 보드들이 걸린 영역 */}
        <div className="w-full px-5" style={{ maxWidth: 380 }}>

          {/* 방 이름 명패 */}
          <div className="flex items-center justify-center mb-5">
            <div className="px-5 py-2 rounded-full text-center"
              style={{ background: 'linear-gradient(135deg,rgba(60,35,10,0.9),rgba(90,55,15,0.85))', border: '1px solid rgba(210,170,80,0.5)', boxShadow: '0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(210,170,80,0.2)' }}>
              <p className="text-amber-300 font-bold text-xs tracking-widest" style={{ wordBreak: 'keep-all' }}>
                {cellName} 모임방
              </p>
            </div>
          </div>

          {/* 3×3 보드 그리드 */}
          <div className="grid grid-cols-3 gap-3">
            {BOARDS.map((board) => {
              const badge = board.key === 'chat' ? newMsgCount : board.key === 'board' ? notes.length : 0
              const isTimerActive = board.key === 'timer' && isLive

              return (
                <button
                  key={board.key}
                  onClick={() => openDrawer(board.key)}
                  className="relative flex flex-col items-center justify-center gap-1.5 rounded-xl transition-all duration-150 active:scale-95"
                  style={{
                    aspectRatio: '1',
                    background: `linear-gradient(145deg, rgba(18,10,4,0.88) 0%, rgba(35,20,8,0.75) 100%)`,
                    border: `1.5px solid ${board.accent}50`,
                    boxShadow: [
                      `0 6px 20px rgba(0,0,0,0.55)`,
                      `0 1px 0 ${board.accent}30 inset`,
                      `0 -1px 0 rgba(0,0,0,0.4) inset`,
                      isTimerActive ? `0 0 14px ${board.glow}` : '',
                    ].filter(Boolean).join(','),
                  }}
                >
                  {/* 상단 걸이 핀 */}
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex gap-3">
                    <div className="w-2 h-3 rounded-full" style={{ background: `linear-gradient(180deg,${board.accent},${board.accent}80)`, boxShadow: `0 2px 4px rgba(0,0,0,0.5)` }} />
                  </div>

                  {/* 알림 배지 */}
                  {badge > 0 && (
                    <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 z-10"
                      style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }}>
                      {badge > 99 ? '99+' : badge}
                    </div>
                  )}

                  {/* LIVE 펄스 */}
                  {isTimerActive && (
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  )}

                  {/* 보드 내부 발광 */}
                  <div className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-200"
                    style={{ background: `radial-gradient(ellipse 70% 60% at 50% 40%, ${board.glow} 0%, transparent 70%)` }} />

                  {/* 아이콘 */}
                  <span className="text-[28px] leading-none relative z-10">{board.icon}</span>

                  {/* 레이블 */}
                  <span className="text-[10px] font-semibold text-center leading-tight whitespace-pre-line relative z-10"
                    style={{ color: board.accent, textShadow: `0 0 10px ${board.glow}` }}>
                    {board.label}
                  </span>

                  {/* 하단 장식선 */}
                  <div className="absolute bottom-1.5 left-3 right-3 h-px"
                    style={{ background: `linear-gradient(90deg,transparent,${board.accent}40,transparent)` }} />
                </button>
              )
            })}
          </div>

          {/* 하단 힌트 텍스트 */}
          <p className="text-center text-[10px] mt-4" style={{ color: 'rgba(200,160,80,0.4)' }}>
            보드를 눌러 기능을 열어보세요
          </p>
        </div>
      </div>

      {/* ══ 프로필 카드 팝업 ══════════════════════════════════ */}
      {profileCard && (
        <div className="absolute left-4 right-4 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3"
          style={{ zIndex: 20, bottom: 20, background: 'rgba(8,4,2,0.96)', border: '1px solid rgba(200,160,80,0.4)', boxShadow: '0 -4px 30px rgba(0,0,0,0.6)' }}>
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
                    style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>{t}</span>
                ))}
              </div>
            ) : <p className="text-xs text-slate-500 mt-0.5">직분 미설정</p>}
          </div>
          <button onClick={() => setProfileCard(null)} className="flex-shrink-0 text-slate-500 p-1 hover:text-amber-400">✕</button>
        </div>
      )}

      {/* ══ 드로어 (보드 내용 슬라이드업) ══════════════════════ */}
      {activeDrawer && (
        <>
          {/* 백드롭 */}
          <div className="absolute inset-0" style={{ zIndex: 30, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
            onClick={() => setActiveDrawer(null)} />

          {/* 드로어 패널 */}
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl overflow-hidden flex flex-col"
            style={{
              zIndex: 40,
              height: activeDrawer === 'chat' || activeDrawer === 'board' ? '84vh' : '78vh',
              background: 'linear-gradient(180deg,#0d1120 0%,#111827 100%)',
              border: `1px solid ${activeBoard?.accent ?? 'rgba(251,191,36,0.2)'}30`,
              borderBottom: 'none',
              boxShadow: `0 -8px 40px rgba(0,0,0,0.7), 0 -1px 0 ${activeBoard?.accent ?? '#C9A227'}25`,
              animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)',
            }}>

            {/* 드로어 헤더 */}
            <div className="flex flex-col items-center pt-2.5 pb-2 flex-shrink-0"
              style={{ borderBottom: `1px solid ${activeBoard?.accent ?? 'rgba(251,191,36,0.2)'}20` }}>
              {/* 핸들 바 */}
              <div className="w-10 h-1 rounded-full bg-slate-600 mb-2.5" />
              <div className="flex items-center justify-between w-full px-5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{activeBoard?.icon}</span>
                  <h2 className="font-bold text-sm" style={{ color: activeBoard?.accent ?? '#C9A227' }}>
                    {activeBoard?.label.replace('\n', ' ')}
                  </h2>
                  {activeDrawer === 'chat' && isLeader && (
                    <span className="text-[9px] text-slate-500 ml-1">
                      {members.length}명 접속
                    </span>
                  )}
                </div>
                <button onClick={() => setActiveDrawer(null)}
                  className="w-7 h-7 rounded-full bg-slate-700/80 text-slate-400 hover:text-white flex items-center justify-center text-sm">✕</button>
              </div>
            </div>

            {/* 드로어 컨텐츠 */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {DrawerContent()}
            </div>
          </div>
        </>
      )}

      {/* 슬라이드업 애니메이션 */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0.6; }
          to   { transform: translateY(0);    opacity: 1;   }
        }
      `}</style>
    </div>
  )
}
