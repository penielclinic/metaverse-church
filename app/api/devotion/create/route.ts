import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function expToNextLevel(level: number) {
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await req.json()
    const bibleRef: string | undefined = body.bibleRef?.trim()
    const content: string | undefined = body.content?.trim()

    if (!bibleRef || !content) {
      return NextResponse.json(
        { error: '성경 본문과 묵상 내용을 입력해주세요.' },
        { status: 400 }
      )
    }
    if (content.length < 20) {
      return NextResponse.json(
        { error: '묵상 내용을 20자 이상 작성해주세요.' },
        { status: 400 }
      )
    }

    const today = new Date().toISOString().split('T')[0] // 'YYYY-MM-DD'

    // 오늘 이미 인증했는지 확인 (UNIQUE 제약이 있지만 친절한 에러 먼저)
    const { count: todayCount } = await supabase
      .from('devotion_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('logged_date', today)

    if ((todayCount ?? 0) > 0) {
      return NextResponse.json(
        { error: '오늘 이미 큐티를 작성했습니다.' },
        { status: 409 }
      )
    }

    // devotion_logs INSERT
    const { data: devotion, error: insertError } = await supabase
      .from('devotion_logs')
      .insert({
        user_id: user.id,
        logged_date: today,
        bible_ref: bibleRef,
        content,
        is_public: true,
      })
      .select('id')
      .single()

    if (insertError || !devotion) {
      console.error('[devotion/create] insert error:', insertError)
      return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 })
    }

    // 스트릭 계산: 어제 인증이 있으면 +1, 없으면 1로 초기화
    const { data: avatar } = await supabase
      .from('avatars')
      .select('level, exp, devotion_streak, last_devotion_date')
      .eq('user_id', user.id)
      .single()

    let newStreak = 1
    if (avatar) {
      const lastDate = avatar.last_devotion_date
        ? new Date(avatar.last_devotion_date as string)
        : null
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      if (lastDate && lastDate.toISOString().split('T')[0] === yesterdayStr) {
        newStreak = ((avatar.devotion_streak as number) ?? 0) + 1
      }
    }

    // EXP 지급 (기본 20, 7일 배수 달성 시 보너스)
    const EXP_BASE = 20
    const bonusExp = newStreak > 0 && newStreak % 7 === 0 ? 30 : 0
    const expEarned = EXP_BASE + bonusExp

    // 아바타 레벨·EXP·스트릭 업데이트
    let levelUp = false
    if (avatar) {
      let level = (avatar.level as number) ?? 1
      let exp = ((avatar.exp as number) ?? 0) + expEarned

      let threshold = expToNextLevel(level)
      while (exp >= threshold) {
        exp -= threshold
        level += 1
        threshold = expToNextLevel(level)
        levelUp = true
      }

      await supabase
        .from('avatars')
        .update({
          level,
          exp,
          devotion_streak: newStreak,
          last_devotion_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
    } else {
      // 아바타 없는 경우 upsert
      await supabase.from('avatars').upsert(
        {
          user_id: user.id,
          devotion_streak: newStreak,
          last_devotion_date: today,
        },
        { onConflict: 'user_id' }
      )
    }

    return NextResponse.json({
      success: true,
      devotionId: devotion.id,
      streak: newStreak,
      expEarned,
      bonusExp,
      levelUp,
    })
  } catch (err) {
    console.error('[devotion/create] unexpected error:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
