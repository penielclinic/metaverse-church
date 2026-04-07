import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 뱃지 자동 지급 조건 정의
// type별 누적 완료 횟수가 requiredCount에 도달하면 slug 뱃지를 지급
const BADGE_CONDITIONS: Array<{
  slug: string
  label: string
  emoji: string
  type: 'bible' | 'prayer' | 'worship' | 'service'
  requiredCount: number
}> = [
  { slug: 'bible_rookie',   label: '말씀새싹',   emoji: '🌱', type: 'bible',   requiredCount: 1 },
  { slug: 'bible_guard',    label: '말씀수호자', emoji: '📖', type: 'bible',   requiredCount: 5 },
  { slug: 'prayer_warrior', label: '기도용사',   emoji: '🙏', type: 'prayer',  requiredCount: 7 },
  { slug: 'worshiper',      label: '예배자',     emoji: '⛪', type: 'worship', requiredCount: 4 },
  { slug: 'servant',        label: '섬김이',     emoji: '🤝', type: 'service', requiredCount: 3 },
]

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
      .select('id, title, type, exp_reward, badge_reward, target_count, is_active')
      .eq('id', challengeId)
      .eq('is_active', true)
      .single()

    if (challengeError || !challenge) {
      return NextResponse.json({ error: '챌린지를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 4. 이번 주 이미 완료했는지 확인 (월요일 00:00 기준)
    const now = new Date()
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1  // 월=0 … 일=6
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - dayOfWeek)
    weekStart.setHours(0, 0, 0, 0)

    const { count: weeklyCount } = await supabase
      .from('challenge_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)
      .gte('completed_at', weekStart.toISOString())

    // target_count만큼 이미 완료한 경우 중복 처리 차단
    if ((weeklyCount ?? 0) >= challenge.target_count) {
      return NextResponse.json(
        { error: '이번 주 해당 챌린지를 이미 완료했습니다.' },
        { status: 409 }
      )
    }

    const expEarned: number = challenge.exp_reward ?? 30

    // 5. challenge_logs INSERT
    const { error: logError } = await supabase.from('challenge_logs').insert({
      user_id: userId,
      challenge_id: challengeId,
      exp_earned: expEarned,
    })

    if (logError) {
      console.error('[challenge/complete] log insert error:', logError)
      return NextResponse.json({ error: '완료 기록 저장에 실패했습니다.' }, { status: 500 })
    }

    // 6. 아바타 경험치·레벨 업데이트
    const { data: avatar, error: avatarError } = await supabase
      .from('avatars')
      .select('level, exp')
      .eq('user_id', userId)
      .single()

    let levelUp = false
    if (!avatarError && avatar) {
      let { level, exp } = avatar as { level: number; exp: number }
      exp = (exp ?? 0) + expEarned

      // 레벨업 체크
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

    // 7. 뱃지 조건 확인 및 자동 지급
    // 이미 획득한 뱃지 조회
    const { data: existingBadges } = await supabase
      .from('user_badges')
      .select('badge_slug')
      .eq('user_id', userId)

    const ownedSlugs = new Set((existingBadges ?? []).map((b: { badge_slug: string }) => b.badge_slug))

    // 이번 완료로 type별 누적 완료 횟수 집계
    const { count: typeCount } = await supabase
      .from('challenge_logs')
      .select(
        `id, challenges!inner(type)`,
        { count: 'exact', head: true }
      )
      .eq('user_id', userId)
      .eq('challenges.type', challenge.type)

    const newBadges: Array<{ slug: string; label: string; emoji: string }> = []

    for (const condition of BADGE_CONDITIONS) {
      if (condition.type !== challenge.type) continue
      if (ownedSlugs.has(condition.slug)) continue
      if ((typeCount ?? 0) >= condition.requiredCount) {
        const { error: badgeError } = await supabase.from('user_badges').insert({
          user_id: userId,
          badge_slug: condition.slug,
        })
        if (!badgeError) {
          newBadges.push({
            slug: condition.slug,
            label: condition.label,
            emoji: condition.emoji,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      expEarned,
      levelUp,
      newBadges,
    })
  } catch (err) {
    console.error('[challenge/complete] unexpected error:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
