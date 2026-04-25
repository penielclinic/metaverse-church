import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'gallery'
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// GET /api/gallery?tag=all
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const tag = searchParams.get('tag') ?? 'all'

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase as any)
      .from('gallery_photos')
      .select('id, user_id, title, tag, public_url, created_at, profiles:user_id ( name )')
      .order('created_at', { ascending: false })

    if (tag !== 'all') q = q.eq('tag', tag)

    const { data, error } = await q
    if (error) {
      console.error('[gallery GET]', error)
      return NextResponse.json({ error: '조회 실패' }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (data ?? []).map((row: any) => ({
      id:        row.id,
      userId:    row.user_id,
      title:     row.title,
      tag:       row.tag,
      publicUrl: row.public_url,
      createdAt: row.created_at,
      authorName: (row.profiles as { name: string } | null)?.name ?? '성도',
    }))

    return NextResponse.json({ data: result })
  } catch (err) {
    console.error('[gallery GET]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST /api/gallery  (multipart/form-data: title, tag, file)
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const formData = await req.formData()
    const title = (formData.get('title') as string | null)?.trim() ?? ''
    const tag   = (formData.get('tag')   as string | null) ?? ''
    const file  = formData.get('file') as File | null

    if (!title) return NextResponse.json({ error: '제목을 입력해주세요.' }, { status: 400 })
    if (!tag)   return NextResponse.json({ error: '태그를 선택해주세요.' }, { status: 400 })
    if (!file)  return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: 'JPG, PNG, WEBP 파일만 업로드할 수 있습니다.' }, { status: 400 })
    if (file.size > MAX_FILE_SIZE)
      return NextResponse.json({ error: '파일 크기는 10MB 이하여야 합니다.' }, { status: 400 })

    const ext         = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const date        = new Date().toISOString().slice(0, 10)
    const uuid        = crypto.randomUUID()
    const storagePath = `${date}-${uuid}.${ext}`
    const arrayBuffer = await file.arrayBuffer()

    const { error: storageError } = await supabase.storage
      .from(BUCKET).upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false })

    if (storageError) {
      console.error('[gallery POST storage]', storageError)
      return NextResponse.json({ error: '파일 업로드 실패' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error: dbError } = await (supabase as any)
      .from('gallery_photos')
      .insert({ user_id: user.id, title, tag, storage_path: storagePath, public_url: urlData.publicUrl })
      .select().single()

    if (dbError) {
      await supabase.storage.from(BUCKET).remove([storagePath])
      console.error('[gallery POST db]', dbError)
      return NextResponse.json({ error: 'DB 저장 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: inserted }, { status: 201 })
  } catch (err) {
    console.error('[gallery POST]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// DELETE /api/gallery?id=123
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))
    if (!id) return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: photo } = await (supabase as any)
      .from('gallery_photos').select('user_id, storage_path').eq('id', id).single()

    if (!photo) return NextResponse.json({ error: '사진을 찾을 수 없습니다.' }, { status: 404 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles').select('role').eq('id', user.id).single()

    const canDelete = photo.user_id === user.id || profile?.role === 'pastor'
    if (!canDelete) return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 })

    await supabase.storage.from(BUCKET).remove([photo.storage_path])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbError } = await (supabase as any).from('gallery_photos').delete().eq('id', id)
    if (dbError) {
      console.error('[gallery DELETE db]', dbError)
      return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[gallery DELETE]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
