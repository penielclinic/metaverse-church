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

  addExp: (amount) =>
    set((state) => {
      const newExp = state.exp + amount
      if (newExp >= state.expToNext) {
        return {
          exp: newExp - state.expToNext,
          level: state.level + 1,
          expToNext: Math.floor(state.expToNext * 1.5),
        }
      }
      return { exp: newExp }
    }),
}))
