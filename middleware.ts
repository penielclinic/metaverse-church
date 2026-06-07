import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PROTECTED_PATHS = ['/world', '/admin']
const PUBLIC_PATHS = ['/login', '/auth/callback', '/pending']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 공개 경로는 세션 갱신만 하고 통과
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const { supabaseResponse } = await updateSession(request)
    return supabaseResponse
  }

  // 보호 경로 접근 시 로그인 여부 + 승인 여부 확인
  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p))) {
    const { supabaseResponse, user, supabase } = await updateSession(request)

    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // 승인 대기 확인 (/world 접근 시에만 — admin은 관리자가 직접 승인하므로 패스)
    if (pathname.startsWith('/world')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('is_approved')
        .eq('id', user.id)
        .single()

      if (profile && profile.is_approved === false) {
        const pendingUrl = request.nextUrl.clone()
        pendingUrl.pathname = '/pending'
        return NextResponse.redirect(pendingUrl)
      }
    }

    return supabaseResponse
  }

  // 그 외 경로: 세션만 갱신
  const { supabaseResponse } = await updateSession(request)
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
