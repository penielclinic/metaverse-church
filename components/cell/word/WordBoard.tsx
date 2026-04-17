'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import WordEditor from './WordEditor'

interface WordBoardData {
  id: number
  cell_id: number
  bible_ref: string
  bible_text: string
  questions: { id: number; text: string }[]
  updated_at: string
  profiles: { name: string } | null
}

interface WordBoardProps {
  cellId: number
  isLeader: boolean
}

export default function WordBoard({ cellId, isLeader }: WordBoardProps) {
  const [board, setBoard] = useState<WordBoardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  const fetchBoard = useCallback(async () => {
    const res = await fetch(`/api/cell/word?cellId=${cellId}`)
    if (res.ok) {
      const json = await res.json()
      setBoard(json.data)
    }
    setLoading(false)
  }, [cellId])

  // 초기 로드
  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  // Supabase Realtime 구독
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`cell_word_board:${cellId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cell_word_boards',
          filter: `cell_id=eq.${cellId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setBoard(null)
          } else {
            setBoard(payload.new as WordBoardData)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [cellId])

  const handleSaved = (updated: WordBoardData) => {
    setBoard(updated)
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-5 animate-pulse">
        <div className="h-5 bg-amber-200 rounded w-1/3 mb-3" />
        <div className="h-4 bg-amber-100 rounded w-full mb-2" />
        <div className="h-4 bg-amber-100 rounded w-4/5" />
      </div>
    )
  }

  if (editing && isLeader) {
    return (
      <WordEditor
        cellId={cellId}
        initial={board}
        onSaved={handleSaved}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-3 bg-amber-100 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">📖</span>
          <h2 className="text-sm font-bold text-amber-900">오늘의 말씀</h2>
        </div>
        {isLeader && (
          <button
            onClick={() => setEditing(true)}
            aria-label="말씀 수정"
            className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-200 transition-colors"
          >
            {/* 연필 아이콘 */}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        {!board || (!board.bible_ref && !board.bible_text) ? (
          <p className="text-sm text-amber-400 text-center py-4" style={{ wordBreak: 'keep-all' }}>
            {isLeader
              ? '연필 버튼을 눌러 오늘의 말씀을 입력해주세요.'
              : '아직 말씀이 등록되지 않았습니다.'}
          </p>
        ) : (
          <>
            {/* 성경 본문 참조 */}
            <div>
              <span className="inline-block text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full mb-2 whitespace-nowrap">
                {board.bible_ref}
              </span>
              {board.bible_text && (
                <p
                  className="text-sm text-amber-900 leading-relaxed italic"
                  style={{ wordBreak: 'keep-all' }}
                >
                  &ldquo;{board.bible_text}&rdquo;
                </p>
              )}
            </div>

            {/* 나눔 질문 */}
            {board.questions.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                  나눔 질문
                </p>
                <ol className="space-y-2">
                  {board.questions.map((q, i) => (
                    <li key={q.id} className="flex gap-2.5 text-sm text-amber-900">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span style={{ wordBreak: 'keep-all' }}>{q.text}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* 마지막 수정자 */}
            {board.profiles?.name && (
              <p className="text-[11px] text-amber-400 text-right pt-1">
                {board.profiles.name} 순장 ·{' '}
                {new Date(board.updated_at).toLocaleDateString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
