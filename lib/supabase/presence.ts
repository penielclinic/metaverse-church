'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── 전역 월드 Presence ─────────────────────────────────────────
export interface WorldPresenceUser {
  userId: string
  name: string
  spaceSlug: string
  avatarLevel: number
}

/**
 * 전체 메타버스 접속자 추적 훅
 * - WorldLayout에서 사용: 어떤 공간에 몇 명이 있는지 실시간 집계
 * - userId가 null(비로그인)이면 아무것도 하지 않음
 */
export function useWorldPresence({
  userId,
  name,
  spaceSlug,
  avatarLevel,
  onSync,
}: {
  userId: string | null
  name: string
  spaceSlug: string
  avatarLevel: number
  onSync: (users: WorldPresenceUser[]) => void
}) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const onSyncRef  = useRef(onSync)
  onSyncRef.current = onSync

  // 채널 구독 — userId 확보 후 1회 실행
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    const channel  = supabase.channel('world:global', {
      config: { presence: { key: userId } },
    })
    channelRef.current = channel

    const handleSync = () => {
      const state = channel.presenceState<WorldPresenceUser>()
      onSyncRef.current(Object.values(state).flat())
    }

    channel
      .on('presence', { event: 'sync' },  handleSync)
      .on('presence', { event: 'join' },  handleSync)
      .on('presence', { event: 'leave' }, handleSync)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId, name, spaceSlug, avatarLevel })
        }
      })

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // 공간·이름·레벨 변경 시 presence 재전송
  useEffect(() => {
    if (!channelRef.current || !userId) return
    channelRef.current.track({ userId, name, spaceSlug, avatarLevel })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceSlug, userId, name, avatarLevel])
}

export interface PresenceUser {
  userId: string
  name: string
  x: number
  y: number
  skinTone: string
  gender: string
  hairStyle: string
  outfit: string
  benchId: string | null    // 앉은 벤치 id (null = 서 있음)
  seatIndex: number | null  // 벤치 내 좌석 번호 (0~2)
}

export interface ChatMessage {
  id: string
  userId: string
  name: string
  content: string
  x: number   // 발송 시 아바타 x 위치
  y: number   // 발송 시 아바타 y 위치
  ts: number
}

type PresenceState = Record<string, PresenceUser[]>

export function usePlazaPresence({
  spaceId,
  me,
  onSync,
  onChat,
}: {
  spaceId: string
  me: PresenceUser
  onSync: (users: PresenceUser[]) => void
  onChat?: (msg: ChatMessage) => void
}) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const meRef = useRef(me)
  meRef.current = me

  const onChatRef = useRef(onChat)
  onChatRef.current = onChat

  const trackPosition = useCallback(async (
    x: number,
    y: number,
    benchId: string | null = null,
    seatIndex: number | null = null,
  ) => {
    if (!channelRef.current) return
    await channelRef.current.track({ ...meRef.current, x, y, benchId, seatIndex })
  }, [])

  const sendChat = useCallback(async (content: string): Promise<ChatMessage | null> => {
    if (!channelRef.current) return null
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      userId: meRef.current.userId,
      name: meRef.current.name,
      content,
      x: meRef.current.x,
      y: meRef.current.y,
      ts: Date.now(),
    }
    await channelRef.current.send({
      type: 'broadcast',
      event: 'chat',
      payload: msg,
    })
    return msg
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`plaza:${spaceId}`, {
      config: { presence: { key: me.userId } },
    })
    channelRef.current = channel

    const handleSync = () => {
      const state = channel.presenceState<PresenceUser>() as PresenceState
      const users = Object.values(state)
        .flat()
        .filter((u) => u.userId !== me.userId)
      onSync(users)
    }

    channel
      .on('presence', { event: 'sync' }, handleSync)
      .on('presence', { event: 'join' }, handleSync)
      .on('presence', { event: 'leave' }, handleSync)
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        onChatRef.current?.(payload as ChatMessage)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ ...meRef.current })
        }
      })

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, me.userId])

  return { trackPosition, sendChat }
}
