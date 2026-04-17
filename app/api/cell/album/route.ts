import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'cell-album'
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// GET /api/cell/album?cellId=1
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const cellId = Number(searchParams.get('cellId'))
    if (!cellId) return NextResponse.json({ error: 'cellId가 필요합니다.' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('cell_album')
      .select('id, cell_id, user_id, storage_path, public_url, file_name, created_at, profiles:user_id ( name )')
      .eq('cell_id', cellId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[cell/album GET]', error)
      return NextResponse.json({ error: '조회 실패' }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (data ?? []).map((row: any) => ({
      ...row,
      authorName: (row.profiles as { name: string } | null)?.name ?? '순원',
      profiles: undefined,
    }))

    return NextResponse.json({ data: result })
  } catch (err) {
    console.error('[cell/album GET]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST /api/cell/album  (multipart/form-data: cellId, file)
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const formData = await req.formData()
    const cellId   = Number(formData.get('cellId'))
    const file     = formData.get('file') as File | null

    if (!cellId) return NextResponse.json({ error: 'cellId가 필요합니다.' }, { status: 400 })
    if (!file)   return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: 'JPG, PNG, WEBP 파일만 업로드할 수 있습니다.' }, { status: 400 })
    if (file.size > MAX_FILE_SIZE)
      return NextResponse.json({ error: '파일 크기는 10MB 이하여야 합니다.' }, { status: 400 })

    // 셀 멤버 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles').select('role, cell_id').eq('id', user.id).single()

    const isMember = profile?.cell_id === cellId || profile?.role === 'pastor' || profile?.role === 'youth_pastor'
    if (!isMember) return NextResponse.json({ error: '해당 셀 멤버만 업로드할 수 있습니다.' }, { status: 403 })

    // Storage 업로드
    const ext          = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const date         = new Date().toISOString().slice(0, 10)
    const uuid         = crypto.randomUUID()
    const storagePath  = `cell-${cellId}/${date}-${uuid}.${ext}`
    const arrayBuffer  = await file.arrayBuffer()

    const { error: storageError } = await supabase.storage
      .from(BUCKET).upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false })

    if (storageError) {
      console.error('[cell/album POST storage]', storageError)
      return NextResponse.json({ error: '파일 업로드 실패' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

    // DB INSERT
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error: dbError } = await (supabase as any)
      .from('cell_album')
      .insert({ cell_id: cellId, user_id: user.id, storage_path: storagePath, public_url: urlData.publicUrl, file_name: file.name })
      .select().single()

    if (dbError) {
      await supabase.storage.from(BUCKET).remove([storagePath])
      console.error('[cell/album POST db]', dbError)
      return NextResponse.json({ error: 'DB 저장 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: inserted }, { status: 201 })
  } catch (err) {
    console.error('[cell/album POST]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// DELETE /api/cell/album?id=123
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
      .from('cell_album').select('user_id, cell_id, storage_path').eq('id', id).single()

    if (!photo) return NextResponse.json({ error: '사진을 찾을 수 없습니다.' }, { status: 404 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles').select('role, cell_id').eq('id', user.id).single()

    const canDelete =
      photo.user_id === user.id ||
      profile?.role === 'pastor' ||
      profile?.role === 'youth_pastor' ||
      (profile?.role === 'cell_leader' && profile?.cell_id === photo.cell_id)

    if (!canDelete) return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 })

    await supabase.storage.from(BUCKET).remove([photo.storage_path])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbError } = await (supabase as any).from('cell_album').delete().eq('id', id)
    if (dbError) {
      console.error('[cell/album DELETE db]', dbError)
      return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[cell/album DELETE]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
