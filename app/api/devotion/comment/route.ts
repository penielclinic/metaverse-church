/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createClient() as any
  const { searchParams } = new URL(req.url)
  const devotionId = searchParams.get('devotionId')
  if (!devotionId) return NextResponse.json({ error: 'devotionId 필요' }, { status: 400 })

  const { data, error } = await supabase
    .from('devotion_comments')
    .select('id, content, created_at, user_id')
    .eq('devotion_id', Number(devotionId))
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as any[]
  const userIds = Array.from(new Set<string>(rows.map((c: any) => c.user_id)))
  const nameMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', userIds)
    ;(profiles ?? []).forEach((p: any) => { nameMap[p.id] = p.name })
  }

  const comments = rows.map((c: any) => ({
    id: c.id,
    content: c.content,
    createdAt: c.created_at,
    userId: c.user_id,
    authorName: nameMap[c.user_id] ?? '성도',
  }))

  return NextResponse.json({ comments })
}

export async function POST(req: Request) {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { devotionId, content } = await req.json()
  if (!devotionId || !content?.trim()) {
    return NextResponse.json({ error: '내용을 입력하세요' }, { status: 400 })
  }

  const { error } = await supabase.from('devotion_comments').insert({
    devotion_id: devotionId,
    user_id: user.id,
    content: content.trim(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const commentId = searchParams.get('id')
  if (!commentId) return NextResponse.json({ error: 'id 필요' }, { status: 400 })

  await supabase.from('devotion_comments').delete().eq('id', Number(commentId)).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
