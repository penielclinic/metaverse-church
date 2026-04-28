import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // 로그인 후 profiles 행이 없으면 자동 생성 (카카오 메타데이터 활용)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        if (!existing) {
          // 카카오 메타데이터에서 이름 추출
          const meta = user.user_metadata ?? {}
          const name: string =
            meta.full_name ?? meta.name ?? meta.nickname ??
            user.email?.split('@')[0] ?? '성도'

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('profiles') as any).insert({
            id: user.id,
            name,
            role: 'member',
          })
        }
      }

      return NextResponse.redirect(`${origin}/world`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=true`)
}
