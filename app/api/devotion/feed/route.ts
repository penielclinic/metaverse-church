import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type AmenRow = { user_id: string }
type ProfileRow = { id: string; name: string }
type DevotionRow = {
  id: number
  bible_ref: string | null
  content: string | null
  created_at: string
  user_id: string
  profiles: ProfileRow
  devotion_amens: AmenRow[]
}

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const today = new Date().toISOString().split('T')[0]

    // 오늘 큐티 목록 (공개 항목) + 작성자 이름 + 아멘 목록
    const { data: rawLogs, error } = await supabase
      .from('devotion_logs')
      .select(
        `
        id,
        bible_ref,
        content,
        created_at,
        user_id,
        profiles!inner ( id, name ),
        devotion_amens ( user_id )
      `
      )
      .eq('logged_date', today)
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[devotion/feed] select error:', error)
      return NextResponse.json({ error: '피드를 불러오지 못했습니다.' }, { status: 500 })
    }

    const logs = (rawLogs ?? []) as unknown as DevotionRow[]

    // 내 오늘 큐티 여부 확인
    let myDevotionToday = false
    if (user) {
      const { count } = await supabase
        .from('devotion_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('logged_date', today)
      myDevotionToday = (count ?? 0) > 0
    }

    // 내 아바타 스트릭 조회
    let myStreak = 0
    if (user) {
      const { data: av } = await supabase
        .from('avatars')
        .select('devotion_streak')
        .eq('user_id', user.id)
        .single()
      myStreak = av?.devotion_streak ?? 0
    }

    const feed = logs.map((d) => ({
      id: d.id,
      bibleRef: d.bible_ref ?? '',
      content: d.content ?? '',
      createdAt: d.created_at,
      authorId: d.profiles?.id ?? '',
      authorName: d.profiles?.name ?? '성도',
      amenCount: d.devotion_amens?.length ?? 0,
      isAmenedByMe: user ? (d.devotion_amens ?? []).some((a) => a.user_id === user.id) : false,
      isMyOwn: user ? d.user_id === user.id : false,
    }))

    return NextResponse.json({ feed, myDevotionToday, myStreak })
  } catch (err) {
    console.error('[devotion/feed] unexpected error:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
