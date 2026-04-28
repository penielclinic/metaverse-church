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

    // 프로필(이름, 직분)도 함께 반환
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, titles, cell_id')
      .eq('id', user.id)
      .single()

    const profileData = profile as { name?: string; titles?: string[]; cell_id?: number } | null
    return NextResponse.json({
      userId: user.id,
      avatar: { ...(avatar ?? {}), cell_id: profileData?.cell_id ?? null },
      name: profileData?.name ?? null,
      titles: profileData?.titles ?? [],
      level:     (avatar as Record<string, unknown> | null)?.level      ?? 1,
      exp:       (avatar as Record<string, unknown> | null)?.exp        ?? 0,
      expToNext: (avatar as Record<string, unknown> | null)?.exp_to_next ?? 100,
    })
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
    const { skin_tone, gender, hair_style, outfit, name, titles,
            eye_makeup, glasses, earring, necklace } = body

    const validSkinTones = ['light', 'medium', 'tan', 'dark']
    const validGenders   = ['male', 'female']
    const validHairBases = [
      'short', 'sports', 'slickback', 'sidepart', 'curly', 'twoblock',
      'fade', 'medium', 'center', 'topknot', 'longhair', 'bald',
      'bob', 'long', 'wave', 'ponytail', 'bun', 'straight',
      'twin', 'half_up', 'braid',
    ]
    const validOutfits = [
      'casual', 'formal', 'hanbok', 'worship_team', 'pastor',
      'hoodie', 'shirt', 'blouse', 'sweater', 'vest',
    ]
    const validEyeMakeup = ['none','natural','cat_eye','smoky','colorful','glitter','retro','gradient','innocent','bold','mono']
    const validGlasses   = ['none','round','square','oval','half_rim','rimless','sun_aviator','sun_wayfarer','sun_oversized','sun_cat','sun_round']
    const validEarring   = ['none','stud','hoop','drop','pearl','star','heart','flower','dangle','cross','chain']
    const validNecklace  = ['none','simple','pearl','cross','heart','choker','layered','star','flower','locket','ribbon']

    const hairBase = typeof hair_style === 'string' ? hair_style.split('+')[0] : ''
    if (!validSkinTones.includes(skin_tone) || !validGenders.includes(gender) ||
        !validHairBases.includes(hairBase) || !validOutfits.includes(outfit)) {
      return NextResponse.json({ error: '유효하지 않은 값입니다.' }, { status: 400 })
    }
    // 악세서리는 값이 있을 때만 검증 (없으면 기본값 'none')
    const safeEyeMakeup = validEyeMakeup.includes(eye_makeup)  ? eye_makeup  : 'none'
    const safeGlasses   = validGlasses.includes(glasses)       ? glasses     : 'none'
    const safeEarring   = validEarring.includes(earring)       ? earring     : 'none'
    const safeNecklace  = validNecklace.includes(necklace)     ? necklace    : 'none'

    // 이름 + 직분 업데이트 (titles 컬럼은 마이그레이션으로 추가됨 — 타입 무시)
    if (name && typeof name === 'string' && name.trim().length > 0) {
      const titlesArr: string[] = Array.isArray(titles)
        ? (titles as unknown[]).filter((t): t is string => typeof t === 'string')
        : []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('profiles') as any).update({ name: name.trim(), titles: titlesArr }).eq('id', user.id)
    }

    // 아바타 외형 저장
    const { data: existing } = await supabase
      .from('avatars')
      .select('id')
      .eq('user_id', user.id)
      .single()

    const accessoryFields = { eye_makeup: safeEyeMakeup, glasses: safeGlasses, earring: safeEarring, necklace: safeNecklace }

    if (existing) {
      // 기본 외형 저장
      const { error } = await supabase
        .from('avatars')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ skin_tone, gender, hair_style, outfit, updated_at: new Date().toISOString() } as any)
        .eq('user_id', user.id)
      if (error) return NextResponse.json({ error: '업데이트 실패' }, { status: 500 })
      // 악세서리 저장 — 컬럼 미존재 시 조용히 무시 (migration 032 실행 전까지)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('avatars') as any)
        .update({ ...accessoryFields, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .catch(() => {/* migration 032 미실행 시 무시 */})
    } else {
      // 기본 외형 생성
      const { error } = await supabase
        .from('avatars')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert({ user_id: user.id, skin_tone, gender, hair_style, outfit } as any)
      if (error) return NextResponse.json({ error: '생성 실패' }, { status: 500 })
      // 악세서리 저장 — 컬럼 미존재 시 조용히 무시
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('avatars') as any)
        .update({ ...accessoryFields })
        .eq('user_id', user.id)
        .catch(() => {/* migration 032 미실행 시 무시 */})
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[avatar POST]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
