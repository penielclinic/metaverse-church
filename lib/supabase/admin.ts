import { createClient } from '@supabase/supabase-js'

/**
 * Supabase service role 클라이언트 — RLS 우회 가능.
 * 서버 사이드(API Route) 에서만 사용할 것.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
