import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 레벨별 필요 EXP (level 1→2: 100, 2→3: 150, ...)
function expToNextLevel(level: number) {
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    // 1. 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const userId = user.id

    // 2. 요청 본문 파싱
    const body = await req.json()
    const challengeId: number | undefined = body.challengeId

    if (!challengeId || typeof challengeId !== 'number') {
      return NextResponse.json({ error: 'challengeId가 필요합니다.' }, { status: 400 })
    }

    // 3. 챌린지 정보 조회
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, name, type, exp_reward, badge_id, target_count, is_active')
      .eq('id', challengeId)
      .eq('is_active', true)
      .single()

    if (challengeError || !challenge) {
      return NextResponse.json({ error: '챌린지를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 4. 기존 진행 로그 확인
    const { data: existingLog } = await supabase
      .from('challenge_logs')
      .select('id, progress, completed')
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)
      .single()

    if (existingLog?.completed) {
      return NextResponse.json(
        { error: '이미 완료한 챌린지입니다.' },
        { status: 409 }
      )
    }

    const newProgress = (existingLog?.progress ?? 0) + 1
    const isCompleted = newProgress >= challenge.target_count
    const expEarned = isCompleted ? (challenge.exp_reward ?? 50) : 0

    // 5. challenge_logs upsert
    if (existingLog) {
      await supabase
        .from('challenge_logs')
        .update({
          progress: newProgress,
          completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLog.id)
    } else {
      await supabase.from('challenge_logs').insert({
        user_id: userId,
        challenge_id: challengeId,
        progress: newProgress,
        completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
    }

    // 6. 완료 시 아바타 경험치·레벨 업데이트
    let levelUp = false
    if (isCompleted) {
      const { data: avatar } = await supabase
        .from('avatars')
        .select('level, exp')
        .eq('user_id', userId)
        .single()

      if (avatar) {
        let { level, exp } = avatar
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
          .eq('user_id', userId)
      }
    }

    // 7. 완료 시 뱃지 지급 (badge_id가 있는 경우)
    const newBadgeId: number | null = isCompleted ? (challenge.badge_id ?? null) : null
    if (newBadgeId) {
      const { data: alreadyHas } = await supabase
        .from('user_badges')
        .select('id')
        .eq('user_id', userId)
        .eq('badge_id', newBadgeId)
        .single()

      if (!alreadyHas) {
        await supabase.from('user_badges').insert({
          user_id: userId,
          badge_id: newBadgeId,
        })
      }
    }

    return NextResponse.json({
      success: true,
      progress: newProgress,
      targetCount: challenge.target_count,
      completed: isCompleted,
      expEarned,
      levelUp,
      badgeEarned: newBadgeId !== null,
    })
  } catch (err) {
    console.error('[challenge/complete] unexpected error:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
