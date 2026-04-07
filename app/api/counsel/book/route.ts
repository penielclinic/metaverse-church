import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function sendAlimtalk(phone: string, message: string) {
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
        templateCode: 'COUNSEL_BOOK',
        recipientList: [
          {
            recipientNo: phone.replace(/-/g, ''),
            templateParameter: { message },
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
  const { counselor_id, scheduled_at, duration_min, method, note } = body

  if (!counselor_id || !scheduled_at || !method) {
    return NextResponse.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400 })
  }

  const validMethods = ['metaverse', 'phone', 'in_person']
  if (!validMethods.includes(method)) {
    return NextResponse.json({ error: '상담 방법이 올바르지 않습니다.' }, { status: 400 })
  }

  // 동일 교역자의 같은 시간대 중복 예약 방지
  const slotStart = new Date(scheduled_at)
  const slotEnd = new Date(slotStart.getTime() + (duration_min ?? 30) * 60_000)

  const { data: conflict } = await supabase
    .from('counsel_bookings')
    .select('id')
    .eq('counselor_id', counselor_id)
    .not('status', 'eq', 'cancelled')
    .lte('scheduled_at', slotEnd.toISOString())
    .gte('scheduled_at', slotStart.toISOString())
    .limit(1)

  if (conflict && conflict.length > 0) {
    return NextResponse.json({ error: '해당 시간은 이미 예약되어 있습니다.' }, { status: 409 })
  }

  const { data: booking, error } = await supabase
    .from('counsel_bookings')
    .insert({
      user_id: user.id,
      counselor_id,
      scheduled_at,
      duration_min: duration_min ?? 30,
      method,
      note: note?.trim() ?? null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: '예약 중 오류가 발생했습니다.' }, { status: 500 })
  }

  // 예약 신청자에게 확정 알림톡 발송
  const { data: requester } = await supabase
    .from('profiles')
    .select('phone, name')
    .eq('id', user.id)
    .single()

  if (requester?.phone) {
    const methodLabel: Record<string, string> = {
      metaverse: '메타버스 채팅',
      phone: '전화',
      in_person: '대면',
    }
    const dateStr = new Date(scheduled_at).toLocaleString('ko-KR', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Seoul',
    })
    await sendAlimtalk(
      requester.phone,
      `상담 예약이 접수되었습니다. 일시: ${dateStr} / 방법: ${methodLabel[method]} (확정 후 별도 안내드립니다)`
    )
  }

  return NextResponse.json({ id: booking.id }, { status: 201 })
}
