import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const devotionId: number | undefined = body.devotionId

    if (!devotionId || typeof devotionId !== 'number') {
      return NextResponse.json({ error: 'devotionId가 필요합니다.' }, { status: 400 })
    }

    // 내 큐티에는 아멘 불가 확인
    const { data: log } = await supabase
      .from('devotion_logs')
      .select('user_id')
      .eq('id', devotionId)
      .single()

    if (log && log.user_id === user.id) {
      return NextResponse.json(
        { error: '본인의 큐티에는 아멘할 수 없습니다.' },
        { status: 403 }
      )
    }

    // 이미 아멘했는지 확인 → 토글
    const { data: existing } = await supabase
      .from('devotion_amens')
      .select('devotion_id')
      .eq('devotion_id', devotionId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('devotion_amens')
        .delete()
        .eq('devotion_id', devotionId)
        .eq('user_id', user.id)
      return NextResponse.json({ amened: false })
    } else {
      const { error: insertError } = await supabase
        .from('devotion_amens')
        .insert({ devotion_id: devotionId, user_id: user.id })

      if (insertError) {
        console.error('[devotion/amen] insert error:', insertError)
        return NextResponse.json({ error: '아멘 저장에 실패했습니다.' }, { status: 500 })
      }
      return NextResponse.json({ amened: true })
    }
  } catch (err) {
    console.error('[devotion/amen] unexpected error:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
