import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PROTECTED_PATHS = ['/world']
const PUBLIC_PATHS = ['/login', '/auth/callback']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 공개 경로는 세션 갱신만 하고 통과
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const { supabaseResponse } = await updateSession(request)
    return supabaseResponse
  }

  // 보호 경로 접근 시 로그인 여부 확인
  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p))) {
    const { supabaseResponse, user } = await updateSession(request)

    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    return supabaseResponse
  }

  // 그 외 경로: 세션만 갱신
  const { supabaseResponse } = await updateSession(request)
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * 아래 경로 제외하고 미들웨어 실행:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
