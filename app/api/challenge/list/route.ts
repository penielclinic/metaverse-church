import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentWeekNum } from '@/lib/challenge-week'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const weekNum = getCurrentWeekNum()

    // 활성 챌린지 + 연결된 뱃지
    const { data: challenges, error } = await supabase
      .from('challenges')
      .select('id, slug, name, description, type, target_count, exp_reward, badge_id, badges(slug,label,emoji)')
      .eq('is_active', true)
      .order('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 이번 주 내 진행 로그
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: logs } = await (supabase.from('challenge_logs') as any)
      .select('challenge_id, progress, completed')
      .eq('user_id', user.id)
      .eq('week_num', weekNum)

    type BadgeRow = { slug: string; label: string; emoji: string } | null
    type ChallengeRow = {
      id: number; slug: string; name: string; description: string
      type: string; target_count: number; exp_reward: number
      badge_id: number | null; badges: BadgeRow | BadgeRow[]
    }
    type LogRow = { challenge_id: number; progress: number; completed: boolean }

    const result = (challenges as ChallengeRow[]).map((c) => {
      const log = (logs as LogRow[] | null)?.find((l) => l.challenge_id === c.id)
      const badge = Array.isArray(c.badges) ? c.badges[0] : c.badges
      return {
        id:           c.id,
        slug:         c.slug,
        title:        c.name,
        description:  c.description,
        type:         c.type,
        targetCount:  c.target_count,
        expReward:    c.exp_reward,
        badgeReward:  badge ? `${badge.emoji} ${badge.label}` : null,
        progress:     log?.progress ?? 0,
        completed:    log?.completed ?? false,
      }
    })

    return NextResponse.json({ weekNum, challenges: result })
  } catch (err) {
    console.error('[challenge/list]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
