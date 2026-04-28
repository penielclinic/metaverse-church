import { create } from 'zustand'

export type GlowColor = 'purple' | 'gold' | 'blue' | 'none'
export type Gender = 'male' | 'female'

interface AvatarState {
  id: string | null
  name: string
  titles: string[]
  level: number
  exp: number
  expToNext: number
  skinTone: string
  gender: Gender
  hairStyle: string
  outfit: string
  badge: string | null
  glowColor: GlowColor
  currentSpaceSlug: string | null

  setAvatar: (data: Partial<AvatarState>) => void
  setCurrentSpace: (slug: string | null) => void
  addExp: (amount: number) => void
}

export const useAvatarStore = create<AvatarState>((set) => ({
  id: null,
  name: '성도',
  titles: [],
  level: 1,
  exp: 0,
  expToNext: 100,
  skinTone: 'medium',
  gender: 'male',
  hairStyle: 'short',
  outfit: 'casual',
  badge: null,
  glowColor: 'none',
  currentSpaceSlug: null,

  setAvatar: (data) => set((state) => ({ ...state, ...data })),

  setCurrentSpace: (slug) => set({ currentSpaceSlug: slug }),

  addExp: (amount) => {
    // 낙관적 업데이트 (즉시 UI 반영)
    set((state) => {
      let newExp    = state.exp + amount
      let newLevel  = state.level
      let newToNext = state.expToNext
      while (newExp >= newToNext) {
        newExp    -= newToNext
        newLevel  += 1
        newToNext  = Math.floor(newToNext * 1.5)
      }
      return { exp: newExp, level: newLevel, expToNext: newToNext }
    })
    // DB 저장 (비동기, 실패 시 조용히 무시)
    fetch('/api/avatar/exp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          // DB 값으로 최종 동기화
          set({ level: data.level, exp: data.exp, expToNext: data.expToNext })
        }
      })
      .catch(() => {/* 네트워크 오류 무시 */})
  },
}))
