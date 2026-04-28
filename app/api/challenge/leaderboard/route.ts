import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // 승인된 순원(profiles.cell_id가 있는 사람)별 아바타 exp + level 합산
    // total_score = (level - 1) * 100 + exp (누적 EXP 근사값)
    const { data, error } = await supabase
      .from('cells')
      .select(`
        id,
        name,
        profiles!profiles_cell_id_fkey (
          id,
          avatars (
            level,
            exp
          )
        )
      `)
      .order('name', { ascending: true })

    if (error) {
      console.error('[leaderboard GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    type AvatarRow = { level: number; exp: number } | null
    type ProfileRow = { id: string; avatars: AvatarRow | AvatarRow[] }
    type CellRow = { id: number; name: string; profiles: ProfileRow[] }

    const rows = (data ?? []) as CellRow[]

    const entries = rows
      .map((cell) => {
        const members = cell.profiles ?? []
        // 각 멤버의 누적 EXP 합산
        const totalExp = members.reduce((sum, p) => {
          const av = Array.isArray(p.avatars) ? p.avatars[0] : p.avatars
          if (!av) return sum
          const lv  = av.level ?? 1
          const ex  = av.exp   ?? 0
          // 레벨 1→N 누적 EXP = 100*(1.5^(lv-1)-1)/(1.5-1) ≈ 200*(1.5^(lv-1)-1)
          // 계산 단순화: 각 레벨 threshold 합산
          let threshold = 100
          let accum = 0
          for (let i = 1; i < lv; i++) {
            accum += threshold
            threshold = Math.floor(threshold * 1.5)
          }
          return sum + accum + ex
        }, 0)

        return {
          cellId: cell.id,
          cellName: cell.name,
          memberCount: members.length,
          exp: totalExp,
        }
      })
      // 승인된 순원이 1명 이상인 순만 표시
      .filter((e) => e.memberCount > 0)
      // EXP 내림차순 정렬
      .sort((a, b) => b.exp - a.exp)
      // 순위 부여
      .map((e, i) => ({ rank: i + 1, ...e }))

    return NextResponse.json({ entries })
  } catch (err) {
    console.error('[leaderboard GET]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
