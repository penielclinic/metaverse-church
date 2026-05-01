import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentWeekNum } from '@/lib/challenge-week'

function expToNextLevel(level: number) {
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await req.json()
    const challengeId: number | undefined = body.challengeId
    if (!challengeId || typeof challengeId !== 'number') {
      return NextResponse.json({ error: 'challengeId가 필요합니다.' }, { status: 400 })
    }

    const weekNum = getCurrentWeekNum()

    // 챌린지 조회
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, name, type, exp_reward, badge_id, target_count, is_active')
      .eq('id', challengeId)
      .eq('is_active', true)
      .single()

    if (challengeError || !challenge) {
      return NextResponse.json({ error: '챌린지를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 이번 주 진행 로그 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingLog } = await (supabase.from('challenge_logs') as any)
      .select('id, progress, completed')
      .eq('user_id', user.id)
      .eq('challenge_id', challengeId)
      .eq('week_num', weekNum)
      .single()

    if (existingLog?.completed) {
      return NextResponse.json({ error: '이번 주에 이미 완료한 챌린지입니다.' }, { status: 409 })
    }

    const newProgress = (existingLog?.progress ?? 0) + 1
    const isCompleted = newProgress >= challenge.target_count
    const expEarned   = isCompleted ? (challenge.exp_reward ?? 50) : 0

    // challenge_logs upsert
    if (existingLog) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('challenge_logs') as any)
        .update({
          progress:     newProgress,
          completed:    isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          updated_at:   new Date().toISOString(),
        })
        .eq('id', existingLog.id)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('challenge_logs') as any).insert({
        user_id:      user.id,
        challenge_id: challengeId,
        week_num:     weekNum,
        progress:     newProgress,
        completed:    isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
    }

    // 완료 시 EXP + 레벨 업데이트
    let levelUp = false
    if (isCompleted) {
      const { data: avatar } = await supabase
        .from('avatars')
        .select('level, exp')
        .eq('user_id', user.id)
        .single()

      if (avatar) {
        let { level, exp } = avatar as { level: number; exp: number }
        exp = (exp ?? 0) + expEarned
        let threshold = expToNextLevel(level)
        while (exp >= threshold) {
          exp -= threshold
          level += 1
          threshold = expToNextLevel(level)
          levelUp = true
        }
        await supabase
          .from('avatars')
          .update({ level, exp, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
      }
    }

    // 완료 시 뱃지 지급
    const newBadges: Array<{ slug: string; label: string; emoji: string }> = []
    if (isCompleted && challenge.badge_id) {
      const { data: badge } = await supabase
        .from('badges')
        .select('id, slug, label, emoji')
        .eq('id', challenge.badge_id)
        .single() as { data: { id: number; slug: string; label: string; emoji: string } | null }

      if (badge) {
        const { data: alreadyHas } = await supabase
          .from('user_badges')
          .select('id')
          .eq('user_id', user.id)
          .eq('badge_id', badge.id)
          .single()

        if (!alreadyHas) {
          await supabase.from('user_badges').insert({ user_id: user.id, badge_id: badge.id })
          newBadges.push({ slug: badge.slug, label: badge.label, emoji: badge.emoji })
        }
      }
    }

    return NextResponse.json({
      success: true,
      progress:    newProgress,
      targetCount: challenge.target_count,
      completed:   isCompleted,
      expEarned,
      levelUp,
      newBadges,
    })
  } catch (err) {
    console.error('[challenge/complete] unexpected error:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
