import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function sendAlimtalk(phone: string, content: string) {
  const appKey = process.env.NHN_APP_KEY
  const secretKey = process.env.NHN_SECRET_KEY
  const senderKey = process.env.NHN_SENDER_KEY

  if (!appKey || !secretKey || !senderKey) return

  await fetch(
    `https://api-alimtalk.cloud.toast.com/alimtalk/v2.2/appkeys/${appKey}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Secret-Key': secretKey,
      },
      body: JSON.stringify({
        senderKey,
        templateCode: 'COUNSEL_NEW',
        recipientList: [
          {
            recipientNo: phone.replace(/-/g, ''),
            templateParameter: { content },
          },
        ],
      }),
    }
  )
}

export async function POST(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const body = await req.json()
  const { title, content, category, is_anonymous } = body

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: '제목과 내용을 입력해주세요.' }, { status: 400 })
  }
  if (content.length > 500) {
    return NextResponse.json({ error: '내용은 500자 이내로 입력해주세요.' }, { status: 400 })
  }

  const { data: post, error } = await supabase
    .from('counsel_posts')
    .insert({
      user_id: user.id,
      title: title.trim(),
      content: content.trim(),
      category: category ?? 'general',
      is_anonymous: is_anonymous ?? true,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: '저장 중 오류가 발생했습니다.' }, { status: 500 })
  }

  // 교역자(pastor)에게 알림톡 발송
  const { data: pastors } = await supabase
    .from('profiles')
    .select('phone')
    .in('role', ['pastor', 'mission_leader'])
    .not('phone', 'is', null)

  if (pastors) {
    const preview = content.length > 30 ? content.slice(0, 30) + '…' : content
    await Promise.allSettled(
      pastors.map((p) =>
        sendAlimtalk(
          p.phone!,
          `새 상담 요청이 있습니다. "${preview}"`
        )
      )
    )
  }

  return NextResponse.json({ id: post.id }, { status: 201 })
}
