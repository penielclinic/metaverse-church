'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface PresenceUser {
  userId: string
  name: string
  x: number
  y: number
  skinTone: string
  gender: string
  hairStyle: string
  outfit: string
}

type PresenceState = Record<string, PresenceUser[]>

export function usePlazaPresence({
  spaceId,
  me,
  onSync,
}: {
  spaceId: string
  me: PresenceUser
  onSync: (users: PresenceUser[]) => void
}) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const meRef = useRef(me)
  meRef.current = me

  const trackPosition = useCallback(async (x: number, y: number) => {
    if (!channelRef.current) return
    await channelRef.current.track({ ...meRef.current, x, y })
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

  return { trackPosition }
}
