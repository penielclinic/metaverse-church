import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    // 빌드 타임 또는 env 미설정 환경에서 더미 클라이언트 반환 (실제 쿼리는 실패)
    return createBrowserClient<Database>('https://placeholder.supabase.co', 'placeholder')
  }
  return createBrowserClient<Database>(url, key)
}
