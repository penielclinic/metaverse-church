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

  // 신청자 + 담당 교역자 정보 조회
  const [{ data: requester }, { data: counselor }] = await Promise.all([
    supabase.from('profiles').select('phone, name').eq('id', user.id).single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('profiles').select('phone, name, counselor_title').eq('id', counselor_id).single(),
  ])

  const methodLabel: Record<string, string> = {
    metaverse: '메타버스 채팅',
    phone: '전화',
    in_person: '대면',
  }
  const dateStr = new Date(scheduled_at).toLocaleString('ko-KR', {
    month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Seoul',
  })

  // 예약 신청자에게 알림톡
  if (requester?.phone) {
    const counselorLabel = counselor?.counselor_title
      ? `${counselor.name} ${counselor.counselor_title}`
      : counselor?.name ?? '교역자'
    await sendAlimtalk(
      requester.phone,
      `상담 예약이 접수되었습니다.\n교역자: ${counselorLabel}\n일시: ${dateStr}\n방법: ${methodLabel[method]}\n(확정 후 별도 안내드립니다)`
    )
  }

  // 담당 교역자에게 알림톡
  if (counselor?.phone) {
    await sendAlimtalk(
      counselor.phone,
      `새 상담 예약이 접수되었습니다.\n신청자: ${requester?.name ?? '성도'}\n일시: ${dateStr}\n방법: ${methodLabel[method]}${note ? `\n메모: ${note.slice(0, 50)}` : ''}`
    )
  }

  return NextResponse.json({ id: booking.id }, { status: 201 })
}
