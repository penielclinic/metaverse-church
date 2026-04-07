'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: number
  booking_id: number
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
}

interface Props {
  bookingId: number
  myUserId: string
  counselorName: string
  onClose: () => void
}

export default function PrivateChat({ bookingId, myUserId, counselorName, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // 기존 메시지 로드
  useEffect(() => {
    supabase
      .from('counsel_messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as Message[])
      })
  }, [bookingId])

  // Realtime 구독
  useEffect(() => {
    const channel = supabase
      .channel(`counsel_chat:${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'counsel_messages',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          setMessages((prev) => {
            // 내가 보낸 메시지는 낙관적 업데이트로 이미 추가되어 있으므로 중복 방지
            const exists = prev.some((m) => m.id === (payload.new as Message).id)
            if (exists) return prev
            return [...prev, payload.new as Message]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [bookingId])

  // 새 메시지 수신 시 스크롤 하단 이동
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return

    setInput('')
    setSending(true)

    // 낙관적 업데이트
    const optimistic: Message = {
      id: Date.now(),
      booking_id: bookingId,
      sender_id: myUserId,
      content: text,
      is_read: false,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    const { error } = await supabase.from('counsel_messages').insert({
      booking_id: bookingId,
      sender_id: myUserId,
      content: text,
    })

    if (error) {
      // 실패 시 낙관적 업데이트 롤백
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setInput(text)
    }

    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Seoul',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl flex flex-col"
        style={{ height: '80vh', maxHeight: '640px' }}>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <div>
            <p className="text-sm font-bold text-gray-800 whitespace-nowrap">{counselorName}</p>
            <p className="text-xs text-gray-400">1:1 상담 채팅</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-sm text-gray-400 mt-8" style={{ wordBreak: 'keep-all' }}>
              상담이 시작되면 여기에 메시지가 표시됩니다.
              <br />
              먼저 인사를 건네보세요 🙏
            </div>
          )}

          {messages.map((msg) => {
            const isMine = msg.sender_id === myUserId
            return (
              <div
                key={msg.id}
                className={['flex items-end gap-2', isMine ? 'flex-row-reverse' : 'flex-row'].join(' ')}
              >
                {/* 아바타 (상대방만) */}
                {!isMine && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                    {counselorName[0]}
                  </div>
                )}

                {/* 버블 + 시간 */}
                <div className={['flex flex-col gap-1', isMine ? 'items-end' : 'items-start'].join(' ')}>
                  <div
                    className={[
                      'max-w-[240px] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words',
                      isMine
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm',
                    ].join(' ')}
                    style={{ wordBreak: 'keep-all' }}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-gray-400 px-1">
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <div className="border-t border-gray-200 px-4 py-3 flex items-end gap-2 flex-shrink-0">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 1000))}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요… (Enter 전송)"
            rows={1}
            className="flex-1 resize-none border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex-shrink-0 w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="전송"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
