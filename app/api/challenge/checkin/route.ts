import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { todayKST, yesterdayKST } from '@/lib/challenge-week'

function expToNextLevel(level: number) {
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const today     = todayKST()
    const yesterday = yesterdayKST()

    // 아바타 streak 조회
    const { data: avatar } = await supabase
      .from('avatars')
      .select('level, exp, devotion_streak, last_devotion_date')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq('user_id', user.id)
      .single() as { data: { level: number; exp: number; devotion_streak: number; last_devotion_date: string | null } | null }

    if (!avatar) {
      return NextResponse.json({ error: '아바타가 없습니다.' }, { status: 404 })
    }

    const lastDate = avatar.last_devotion_date

    // 이미 오늘 인증
    if (lastDate === today) {
      return NextResponse.json({
        alreadyCheckedIn: true,
        streak: avatar.devotion_streak,
        expEarned: 0,
      })
    }

    // 연속 여부 판단
    const newStreak = lastDate === yesterday ? (avatar.devotion_streak ?? 0) + 1 : 1
    const EXP_REWARD = 10

    // EXP + 레벨 계산
    let { level, exp } = avatar
    exp = (exp ?? 0) + EXP_REWARD
    let levelUp = false
    let threshold = expToNextLevel(level)
    while (exp >= threshold) {
      exp -= threshold
      level += 1
      threshold = expToNextLevel(level)
      levelUp = true
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('avatars') as any).update({
      devotion_streak:    newStreak,
      last_devotion_date: today,
      level,
      exp,
      updated_at:         new Date().toISOString(),
    }).eq('user_id', user.id)

    // 7일 연속 뱃지 지급
    let badgeEarned: { slug: string; label: string; emoji: string } | null = null
    if (newStreak >= 7) {
      const { data: badge } = await supabase
        .from('badges')
        .select('id, slug, label, emoji')
        .eq('slug', 'streak_7')
        .single() as { data: { id: number; slug: string; label: string; emoji: string } | null }

      if (badge) {
        const { data: already } = await supabase
          .from('user_badges')
          .select('id')
          .eq('user_id', user.id)
          .eq('badge_id', badge.id)
          .single()

        if (!already) {
          await supabase.from('user_badges').insert({ user_id: user.id, badge_id: badge.id })
          badgeEarned = { slug: badge.slug, label: badge.label, emoji: badge.emoji }
        }
      }
    }

    return NextResponse.json({
      alreadyCheckedIn: false,
      streak: newStreak,
      expEarned: EXP_REWARD,
      levelUp,
      badgeEarned,
    })
  } catch (err) {
    console.error('[challenge/checkin]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
