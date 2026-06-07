import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { name, email, password, phone } = await req.json()

  if (!name || !email || !password) {
    return NextResponse.json({ error: '이름, 이메일, 비밀번호를 모두 입력해 주세요.' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: '비밀번호는 6자리 이상이어야 합니다.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 이미 가입된 이메일인지 확인
  const { data: existing } = await admin.auth.admin.listUsers()
  const already = existing?.users?.find((u) => u.email === email)
  if (already) {
    return NextResponse.json({ error: '이미 가입된 이메일입니다.' }, { status: 409 })
  }

  // auth.users 생성 (이메일 인증 없이 바로 생성)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // 이메일 확인 없이 바로 활성화
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: '계정 생성에 실패했습니다. 다시 시도해 주세요.' }, { status: 500 })
  }

  // profiles 생성 — is_approved=false (관리자 승인 대기)
  const { error: profileError } = await admin.from('profiles').insert({
    id: authData.user.id,
    name: name.trim(),
    phone: phone?.trim() || null,
    role: 'youth',
    is_approved: false,
    signup_method: 'email',
  })

  if (profileError) {
    // 롤백: auth user 삭제
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: '프로필 생성에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
