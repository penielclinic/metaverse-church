import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { amount } = await req.json()
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: '유효하지 않은 EXP 값입니다.' }, { status: 400 })
    }

    // 현재 avatar 조회
    const { data: avatar } = await supabase
      .from('avatars')
      .select('level, exp, exp_to_next')
      .eq('user_id', user.id)
      .single()

    const curLevel   = (avatar as Record<string, unknown> | null)?.level      as number ?? 1
    const curExp     = (avatar as Record<string, unknown> | null)?.exp         as number ?? 0
    const curToNext  = (avatar as Record<string, unknown> | null)?.exp_to_next as number ?? 100

    // 레벨업 계산
    let newExp    = curExp + amount
    let newLevel  = curLevel
    let newToNext = curToNext

    while (newExp >= newToNext) {
      newExp    -= newToNext
      newLevel  += 1
      newToNext  = Math.floor(newToNext * 1.5)
    }

    const levelUp = newLevel > curLevel

    // DB 저장
    const { error } = await supabase
      .from('avatars')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ level: newLevel, exp: newExp, exp_to_next: newToNext } as any)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: '저장 실패' }, { status: 500 })

    return NextResponse.json({
      level: newLevel,
      exp: newExp,
      expToNext: newToNext,
      levelUp,
    })
  } catch (err) {
    console.error('[exp POST]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
