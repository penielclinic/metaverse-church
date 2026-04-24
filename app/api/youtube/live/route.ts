import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY
  const channelId = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID

  if (!apiKey || !channelId) {
    return NextResponse.json({ videoId: null }, { status: 200 })
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&eventType=live&type=video&key=${apiKey}`
    const res = await fetch(url, { next: { revalidate: 60 } })

    if (!res.ok) {
      return NextResponse.json({ videoId: null }, { status: 200 })
    }

    const data = await res.json()
    const videoId = data.items?.[0]?.id?.videoId ?? null

    return NextResponse.json({ videoId }, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
    })
  } catch {
    return NextResponse.json({ videoId: null }, { status: 200 })
  }
}
