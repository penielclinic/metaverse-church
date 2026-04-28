import { create } from 'zustand'

export interface OnlineUser {
  userId: string
  name: string
  spaceSlug: string
  avatarLevel: number
}

interface WorldState {
  currentSpaceSlug: string
  currentSpaceName: string
  onlineUsers: OnlineUser[]
  totalOnline: number

  setCurrentSpace: (slug: string, name: string) => void
  setOnlineUsers: (users: OnlineUser[]) => void
  getSpaceUserCount: (slug: string) => number
}

export const useWorldStore = create<WorldState>((set, get) => ({
  currentSpaceSlug: 'world',
  currentSpaceName: '대시보드',
  onlineUsers: [],
  totalOnline: 0,

  setCurrentSpace: (slug, name) =>
    set({ currentSpaceSlug: slug, currentSpaceName: name }),

  setOnlineUsers: (users) =>
    set({ onlineUsers: users, totalOnline: users.length }),

  getSpaceUserCount: (slug) =>
    get().onlineUsers.filter((u) => u.spaceSlug === slug).length,
}))
