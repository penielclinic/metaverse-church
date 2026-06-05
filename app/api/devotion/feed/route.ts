/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { todayKST } from '@/lib/challenge-week'

export async function GET() {
  try {
    const supabase = await createClient() as any

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const today = todayKST()

    // 1. 큐티 로그 (조인 없이 단순 쿼리)
    const { data: logs, error } = await supabase
      .from('devotion_logs')
      .select('id, bible_ref, content, created_at, user_id, logged_date, is_public')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[devotion/feed] select error:', error)
      return NextResponse.json({ error: '피드를 불러오지 못했습니다.' }, { status: 500 })
    }

    const items = (logs ?? []) as any[]

    // 2. 작성자 이름 조회
    const userIds = Array.from(new Set<string>(items.map((l: any) => l.user_id)))
    const nameMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds)
      ;(profiles ?? []).forEach((p: any) => { nameMap[p.id] = p.name })
    }

    // 3. 아멘 조회
    const logIds = items.map((l: any) => l.id)
    const amenMap: Record<number, string[]> = {}
    if (logIds.length > 0) {
      const { data: amens } = await supabase
        .from('devotion_amens')
        .select('devotion_id, user_id')
        .in('devotion_id', logIds)
      ;(amens ?? []).forEach((a: any) => {
        if (!amenMap[a.devotion_id]) amenMap[a.devotion_id] = []
        amenMap[a.devotion_id].push(a.user_id)
      })
    }

    // 4. 내 오늘 큐티 여부
    let myDevotionToday = false
    if (user) {
      const { count } = await supabase
        .from('devotion_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('logged_date', today)
      myDevotionToday = (count ?? 0) > 0
    }

    // 5. 내 스트릭
    let myStreak = 0
    if (user) {
      const { data: av } = await supabase
        .from('avatars')
        .select('devotion_streak')
        .eq('user_id', user.id)
        .single()
      myStreak = av?.devotion_streak ?? 0
    }

    const feed = items.map((d: any) => {
      const amens = amenMap[d.id] ?? []
      return {
        id: d.id,
        bibleRef: d.bible_ref ?? '',
        content: d.content ?? '',
        createdAt: d.created_at,
        loggedDate: d.logged_date ?? '',
        authorId: d.user_id,
        authorName: nameMap[d.user_id] ?? '성도',
        amenCount: amens.length,
        isAmenedByMe: user ? amens.includes(user.id) : false,
        isMyOwn: user ? d.user_id === user.id : false,
      }
    })

    return NextResponse.json({ feed, myDevotionToday, myStreak })
  } catch (err) {
    console.error('[devotion/feed] unexpected error:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
