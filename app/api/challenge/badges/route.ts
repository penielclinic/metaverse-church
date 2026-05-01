import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const [{ data: allBadges }, { data: earned }] = await Promise.all([
      supabase.from('badges').select('id, slug, label, emoji, description').order('id'),
      supabase.from('user_badges').select('badge_id, earned_at').eq('user_id', user.id),
    ])

    type BadgeRow = { id: number; slug: string; label: string; emoji: string; description: string }
    type EarnedRow = { badge_id: number; earned_at: string }

    const result = (allBadges as BadgeRow[] ?? []).map((b) => {
      const ub = (earned as EarnedRow[] ?? []).find((e) => e.badge_id === b.id)
      return {
        slug:        b.slug,
        label:       b.label,
        emoji:       b.emoji,
        description: b.description,
        earned:      !!ub,
        earnedAt:    ub?.earned_at ?? null,
      }
    })

    return NextResponse.json({ badges: result })
  } catch (err) {
    console.error('[challenge/badges]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
