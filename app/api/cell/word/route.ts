import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/cell/word?cellId=1
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const cellId = Number(searchParams.get('cellId'))

    if (!cellId) {
      return NextResponse.json({ error: 'cellId가 필요합니다.' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('cell_word_boards')
      .select('id, cell_id, bible_ref, bible_text, questions, updated_at, profiles:updated_by ( name )')
      .eq('cell_id', cellId)
      .maybeSingle()

    if (error) {
      console.error('[cell/word GET]', error)
      return NextResponse.json({ error: '조회 실패' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[cell/word GET] unexpected:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST /api/cell/word — 말씀/질문 저장 (순장만)
export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await req.json()
    const cellId: number | undefined = body.cellId
    const bibleRef: string = (body.bibleRef ?? '').trim()
    const bibleText: string = (body.bibleText ?? '').trim()
    const questions: { id: number; text: string }[] = body.questions ?? []

    if (!cellId) {
      return NextResponse.json({ error: 'cellId가 필요합니다.' }, { status: 400 })
    }
    if (!bibleRef) {
      return NextResponse.json({ error: '성경 본문을 입력해주세요.' }, { status: 400 })
    }
    if (questions.length > 5) {
      return NextResponse.json({ error: '나눔 질문은 최대 5개입니다.' }, { status: 400 })
    }

    // 순장 또는 pastor 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, cell_id')
      .eq('id', user.id)
      .single()

    const isLeader =
      profile?.role === 'pastor' ||
      profile?.role === 'youth_pastor' ||
      (profile?.role === 'cell_leader' && profile?.cell_id === cellId)

    if (!isLeader) {
      return NextResponse.json({ error: '순장만 말씀을 수정할 수 있습니다.' }, { status: 403 })
    }

    // upsert (cell_id unique 제약 활용)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('cell_word_boards')
      .upsert(
        {
          cell_id: cellId,
          bible_ref: bibleRef,
          bible_text: bibleText,
          questions,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'cell_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('[cell/word POST]', error)
      return NextResponse.json({ error: '저장 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('[cell/word POST] unexpected:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
