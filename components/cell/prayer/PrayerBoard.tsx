'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import PrayerCard, { type PrayerCardData } from './PrayerCard'

const COLOR_OPTIONS: { value: PrayerCardData['color']; label: string; bg: string }[] = [
  { value: 'yellow', label: '노랑', bg: 'bg-yellow-400' },
  { value: 'blue',   label: '파랑', bg: 'bg-blue-400'   },
  { value: 'green',  label: '초록', bg: 'bg-green-400'  },
  { value: 'pink',   label: '분홍', bg: 'bg-pink-400'   },
]

interface PrayerBoardProps {
  cellId: number
  myUserId: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function PrayerBoard({ cellId, myUserId }: PrayerBoardProps) {
  const [cards, setCards] = useState<PrayerCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newColor, setNewColor] = useState<PrayerCardData['color']>('yellow')
  const [submitting, setSubmitting] = useState(false)
  const [amenLoadingId, setAmenLoadingId] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [formError, setFormError] = useState('')

  const fetchCards = useCallback(async () => {
    const res = await fetch(`/api/cell/prayer?cellId=${cellId}`)
    if (res.ok) {
      const json = await res.json()
      setCards(json.data ?? [])
    }
    setLoading(false)
  }, [cellId])

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  // Supabase Realtime 구독
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`cell_prayer_requests:${cellId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cell_prayer_requests',
          filter: `cell_id=eq.${cellId}`,
        },
        () => {
          // 새 카드 추가 시 목록 재조회 (작성자 이름 포함)
          fetchCards()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cell_prayer_requests',
          filter: `cell_id=eq.${cellId}`,
        },
        (payload) => {
          const updated = payload.new as { id: number; amen_count: number; is_answered: boolean }
          setCards((prev) =>
            prev.map((c) =>
              c.id === updated.id
                ? { ...c, amen_count: updated.amen_count, is_answered: updated.is_answered }
                : c
            )
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'cell_prayer_requests',
          filter: `cell_id=eq.${cellId}`,
        },
        (payload) => {
          const deleted = payload.old as { id: number }
          setCards((prev) => prev.filter((c) => c.id !== deleted.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [cellId, fetchCards])

  const handleAdd = async () => {
    setFormError('')
    if (!newContent.trim()) {
      setFormError('기도제목을 입력해주세요.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/cell/prayer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cellId, content: newContent.trim(), color: newColor }),
      })
      const json = await res.json()
      if (!res.ok) {
        setFormError(json.error ?? '저장 실패')
        return
      }
      setNewContent('')
      setNewColor('yellow')
      setAdding(false)
    } catch {
      setFormError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAmen = async (id: number) => {
    setAmenLoadingId(id)
    try {
      await fetch('/api/cell/prayer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id, action: 'amen' }),
      })
      // Realtime UPDATE 이벤트가 카운트를 업데이트하므로 로컬 상태 즉시 반영
      setCards((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c
          const amened = !c.isAmenedByMe
          return {
            ...c,
            isAmenedByMe: amened,
            amen_count: amened ? c.amen_count + 1 : Math.max(0, c.amen_count - 1),
          }
        })
      )
    } finally {
      setAmenLoadingId(null)
    }
  }

  const handleAnswered = async (id: number) => {
    await fetch('/api/cell/prayer', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: id, action: 'answered' }),
    })
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_answered: !c.is_answered } : c))
    )
  }

  const handleDelete = async (id: number) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id)
      return
    }
    await fetch(`/api/cell/prayer?id=${id}`, { method: 'DELETE' })
    setDeleteConfirmId(null)
    setCards((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="w-full space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🙏</span>
          <h2 className="text-base font-bold text-gray-800">기도제목</h2>
          {cards.length > 0 && (
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {cards.length}
            </span>
          )}
        </div>
        <button
          onClick={() => { setAdding(true); setFormError('') }}
          aria-label="기도제목 추가"
          className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold text-white bg-indigo-500 rounded-xl hover:bg-indigo-600 active:scale-95 transition-all shadow-sm"
        >
          <span className="text-base leading-none">+</span> 기도제목
        </button>
      </div>

      {/* 추가 폼 */}
      {adding && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-sm">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="기도제목을 적어주세요. (최대 200자)"
            rows={3}
            maxLength={200}
            autoFocus
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none placeholder-gray-300"
          />

          {/* 색상 선택 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">색상</span>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setNewColor(opt.value)}
                  aria-label={opt.label}
                  className={[
                    'w-6 h-6 rounded-full transition-all',
                    opt.bg,
                    newColor === opt.value
                      ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                      : 'opacity-60 hover:opacity-90',
                  ].join(' ')}
                />
              ))}
            </div>
          </div>

          <p className="text-right text-xs text-gray-300">{newContent.length}/200</p>

          {formError && (
            <p className="text-xs text-red-500 font-medium">{formError}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => { setAdding(false); setNewContent(''); setFormError('') }}
              disabled={submitting}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleAdd}
              disabled={submitting}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-indigo-500 rounded-xl hover:bg-indigo-600 active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? '저장 중…' : '올리기'}
            </button>
          </div>
        </div>
      )}

      {/* 카드 목록 */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 animate-pulse space-y-2">
              <div className="h-4 bg-yellow-200 rounded w-1/4" />
              <div className="h-3 bg-yellow-100 rounded w-full" />
              <div className="h-3 bg-yellow-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : cards.length === 0 ? (
        <p
          className="text-sm text-gray-400 text-center py-8"
          style={{ wordBreak: 'keep-all' }}
        >
          아직 기도제목이 없습니다. 첫 번째 기도제목을 올려보세요 🙏
        </p>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <div key={card.id}>
              {deleteConfirmId === card.id && (
                <div className="mb-1 flex items-center gap-2 px-1">
                  <p className="text-xs text-red-500 font-medium flex-1" style={{ wordBreak: 'keep-all' }}>
                    삭제하시겠습니까?
                  </p>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="text-xs text-gray-500 hover:text-gray-700 font-semibold"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => handleDelete(card.id)}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold"
                  >
                    삭제
                  </button>
                </div>
              )}
              <PrayerCard
                {...card}
                onAmen={handleAmen}
                onAnswered={handleAnswered}
                onDelete={handleDelete}
                amenLoading={amenLoadingId === card.id}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
