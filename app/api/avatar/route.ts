import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { data: avatar, error } = await supabase
      .from('avatars')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: '아바타 조회 실패' }, { status: 500 })
    }

    return NextResponse.json({ avatar: avatar ?? null })
  } catch (err) {
    console.error('[avatar GET]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await req.json()
    const { skin_tone, gender, hair_style, outfit } = body

    const validSkinTones  = ['light', 'medium', 'tan', 'dark']
    const validGenders    = ['male', 'female']
    const validHairStyles = ['short', 'sports', 'slickback', 'sidepart', 'curly', 'bald',
                             'bob', 'long', 'wave', 'ponytail', 'bun', 'bangs']
    const validOutfits    = ['casual', 'formal', 'hanbok', 'worship_team', 'pastor']

    if (!validSkinTones.includes(skin_tone) || !validGenders.includes(gender) ||
        !validHairStyles.includes(hair_style) || !validOutfits.includes(outfit)) {
      return NextResponse.json({ error: '유효하지 않은 값입니다.' }, { status: 400 })
    }

    // 기존 아바타 확인
    const { data: existing } = await supabase
      .from('avatars')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existing) {
      const { error } = await supabase
        .from('avatars')
        .update({ skin_tone, gender, hair_style, outfit, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
      if (error) return NextResponse.json({ error: '업데이트 실패' }, { status: 500 })
    } else {
      const { error } = await supabase
        .from('avatars')
        .insert({ user_id: user.id, skin_tone, gender, hair_style, outfit })
      if (error) return NextResponse.json({ error: '생성 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[avatar POST]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
