import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/world'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // 신규 유저면 profiles 행 생성
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', data.user.id)
    .single()

  if (!existingProfile) {
    const kakaoName =
      data.user.user_metadata?.name ||
      data.user.user_metadata?.full_name ||
      '성도'

    await supabase.from('profiles').insert({
      id: data.user.id,
      name: kakaoName,
      role: 'youth',
    })

    // 신규 유저 → 아바타 초기화 페이지로
    return NextResponse.redirect(`${origin}/world/avatar?new=true`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
