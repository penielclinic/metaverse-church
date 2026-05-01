/** 2026-04-07(월) 시즌 시작 기준 현재 주차 번호 반환 (1-based) */
export function getCurrentWeekNum(): number {
  const SEASON_START = new Date('2026-04-07T00:00:00+09:00')
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - SEASON_START.getTime()) / 86_400_000)
  return Math.max(1, Math.floor(diffDays / 7) + 1)
}

/** KST 기준 오늘 날짜 문자열 (YYYY-MM-DD) */
export function todayKST(): string {
  return new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10)
}

/** KST 기준 어제 날짜 문자열 (YYYY-MM-DD) */
export function yesterdayKST(): string {
  return new Date(Date.now() + 9 * 3_600_000 - 86_400_000).toISOString().slice(0, 10)
}
