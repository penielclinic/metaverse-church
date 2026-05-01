'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PrayerNote {
  id: number
  content: string
  author: string
  isAnonymous: boolean
  amenCount: number
  color: 'yellow' | 'pink' | 'blue' | 'green'
  myAmen: boolean
  userId: string
}

const COLOR_CLASSES: Record<PrayerNote['color'], string> = {
  yellow: 'bg-yellow-100 border-yellow-300',
  pink: 'bg-pink-100 border-pink-300',
  blue: 'bg-blue-100 border-blue-300',
  green: 'bg-green-100 border-green-300',
}

const NOTE_COLORS: PrayerNote['color'][] = ['yellow', 'pink', 'blue', 'green']

type DbNote = {
  id: number
  user_id: string
  content: string
  is_anonymous: boolean
  amen_count: number
  color: string
  profiles: { name: string } | null
  prayer_amens: { user_id: string }[]
}

export default function PrayerPage() {
  const [notes, setNotes] = useState<PrayerNote[]>([])
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [myRole, setMyRole] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [inputText, setInputText] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [selectedColor, setSelectedColor] = useState<PrayerNote['color']>('yellow')
  const [loading, setLoading] = useState(true)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  const supabase = createClient()

  const toNote = useCallback(
    (d: DbNote): PrayerNote => ({
      id: d.id,
      userId: d.user_id,
      content: d.content,
      author: d.is_anonymous ? '익명' : (d.profiles?.name ?? '성도'),
      isAnonymous: d.is_anonymous,
      amenCount: d.amen_count,
      color: (NOTE_COLORS.includes(d.color as PrayerNote['color'])
        ? d.color
        : 'yellow') as PrayerNote['color'],
      myAmen: myUserId ? d.prayer_amens.some((a) => a.user_id === myUserId) : false,
    }),
    [myUserId]
  )

  // 초기 데이터 로드
  useEffect(() => {
    async function load() {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setMyUserId(user?.id ?? null)

      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile) setMyRole((profile as { role: string }).role ?? '')
      }

      const { data, error } = await supabase
        .from('prayer_notes')
        .select(
          `id, user_id, content, is_anonymous, amen_count, color,
           profiles ( name ),
           prayer_amens ( user_id )`
        )
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && data) {
        setNotes((data as unknown as DbNote[]).map(toNote))
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Supabase Realtime 구독 (prayer_notes INSERT/UPDATE)
  useEffect(() => {
    const channel = supabase
      .channel('prayer_notes_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'prayer_notes' },
        async (payload) => {
          // 새 포스트잇: 작성자 이름을 별도 조회 후 추가
          const { data } = await supabase
            .from('prayer_notes')
            .select(
              `id, user_id, content, is_anonymous, amen_count, color,
               profiles ( name ),
               prayer_amens ( user_id )`
            )
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setNotes((prev) => [toNote(data as unknown as DbNote), ...prev])
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'prayer_notes' },
        (payload) => {
          setNotes((prev) =>
            prev.map((n) =>
              n.id === payload.new.id
                ? { ...n, amenCount: payload.new.amen_count as number }
                : n
            )
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'prayer_notes' },
        (payload) => {
          setNotes((prev) => prev.filter((n) => n.id !== (payload.old as { id: number }).id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUserId])

  const handleAmen = async (id: number) => {
    const note = notes.find((n) => n.id === id)
    if (!note || !myUserId) return

    // 낙관적 업데이트
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              amenCount: n.myAmen ? n.amenCount - 1 : n.amenCount + 1,
              myAmen: !n.myAmen,
            }
          : n
      )
    )

    if (note.myAmen) {
      await supabase.from('prayer_amens').delete().match({ note_id: id, user_id: myUserId })
    } else {
      await supabase.from('prayer_amens').insert({ note_id: id, user_id: myUserId })
    }
  }

  const handleDelete = async (id: number) => {
    if (deleteConfirmId !== id) { setDeleteConfirmId(id); return }
    await supabase.from('prayer_notes').delete().eq('id', id)
    setNotes((prev) => prev.filter((n) => n.id !== id))
    setDeleteConfirmId(null)
  }

  const handleSubmit = async () => {
    if (!inputText.trim() || !myUserId) return

    await supabase.from('prayer_notes').insert({
      user_id: myUserId,
      content: inputText.trim(),
      is_anonymous: isAnonymous,
      color: selectedColor,
    })

    setInputText('')
    setShowModal(false)
    // Realtime INSERT 이벤트가 목록을 자동 갱신
  }

  return (
    <div className="relative min-h-[calc(100vh-56px)] bg-gradient-to-b from-indigo-50 to-purple-50 px-4 py-6">
      {/* 페이지 헤더 */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-800">🙏 기도실</h1>
        <p className="mt-1 text-sm text-gray-500" style={{ wordBreak: 'keep-all' }}>
          기도제목을 포스트잇에 남기고 서로 아멘으로 응원해요
        </p>
        {!loading && (
          <div className="mt-2 text-xs text-gray-400">
            총 {notes.length}개의 기도제목 · 아멘{' '}
            {notes.reduce((s, n) => s + n.amenCount, 0)}회
          </div>
        )}
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 기도 포스트잇 그리드 */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-screen-md mx-auto">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`flex flex-col justify-between rounded-xl border-2 p-3 shadow-sm ${COLOR_CLASSES[note.color]}`}
              style={{ minHeight: '140px' }}
            >
              <p
                className="text-sm text-gray-700 flex-1 leading-snug"
                style={{ wordBreak: 'keep-all' }}
              >
                {note.content}
              </p>

              <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/10 gap-1">
                <span className="text-xs text-gray-500 whitespace-nowrap truncate">{note.author}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* 아멘 버튼 */}
                  <button
                    onClick={() => { setDeleteConfirmId(null); handleAmen(note.id) }}
                    className={[
                      'flex items-center gap-1 px-2.5 rounded-full text-xs font-semibold transition-all',
                      'min-h-[44px] min-w-[44px] justify-center',
                      note.myAmen
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white/70 text-gray-600 hover:bg-indigo-100',
                    ].join(' ')}
                    aria-label={`아멘 ${note.amenCount}개`}
                  >
                    🙏 <span>{note.amenCount}</span>
                  </button>

                  {/* 삭제 버튼 — 본인 또는 관리자(pastor) */}
                  {(note.userId === myUserId || ['pastor', 'youth_pastor'].includes(myRole)) && (
                    deleteConfirmId === note.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-gray-200 text-gray-600 min-h-[44px]"
                        >
                          취소
                        </button>
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-red-500 text-white min-h-[44px]"
                        >
                          삭제
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="flex items-center justify-center w-9 min-h-[44px] rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        aria-label="삭제"
                      >
                        🗑
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 플로팅 작성 버튼 */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold px-5 py-3 rounded-full shadow-lg transition-all min-h-[48px]"
      >
        <span className="text-lg leading-none">✏️</span>
        <span className="whitespace-nowrap">기도제목 쓰기</span>
      </button>

      {/* 작성 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5">
            <h2 className="text-lg font-bold text-gray-800 mb-3">기도제목 작성</h2>

            {/* 색상 선택 — 터치 영역 48px */}
            <div className="flex gap-2 mb-3">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className={[
                    'w-12 h-12 rounded-full border-2 transition-all',
                    c === 'yellow' ? 'bg-yellow-200' : '',
                    c === 'pink' ? 'bg-pink-200' : '',
                    c === 'blue' ? 'bg-blue-200' : '',
                    c === 'green' ? 'bg-green-200' : '',
                    selectedColor === c ? 'border-gray-700 scale-110' : 'border-transparent',
                  ].join(' ')}
                  aria-label={`${c} 색상`}
                />
              ))}
            </div>

            <textarea
              className="w-full border border-gray-300 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
              rows={4}
              placeholder="기도제목을 입력하세요..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              maxLength={200}
            />
            <div className="text-right text-xs text-gray-400 mb-3">{inputText.length}/200</div>

            {/* 익명 토글 */}
            <label className="flex items-center gap-2 mb-4 cursor-pointer min-h-[48px]">
              <input
                type="checkbox"
                className="w-5 h-5 accent-indigo-600"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />
              <span className="text-sm text-gray-600">익명으로 올리기</span>
            </label>

            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors min-h-[48px]"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={!inputText.trim() || !myUserId}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[48px]"
              >
                올리기
              </button>
            </div>
            {!myUserId && (
              <p className="text-center text-xs text-red-400 mt-2">로그인 후 작성 가능합니다.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
