import type { User } from 'firebase/auth'
import { create } from 'zustand'
import type { UserProfile } from '@/lib/types'

export type AuthStatus = 'loading' | 'out' | 'unverified' | 'ready'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  status: AuthStatus
  /** Recomputes status from a (possibly reloaded) Firebase user. */
  sync: (user: User | null) => void
  setProfile: (p: UserProfile | null) => void
}

export const isVerified = (u: User) =>
  u.emailVerified || !!u.phoneNumber || u.providerData.some((p) => p.providerId === 'google.com')

export const useAuth = create<AuthState>((set) => ({
  user: null,
  profile: null,
  status: 'loading',
  sync: (user) =>
    set({ user, status: !user ? 'out' : isVerified(user) ? 'ready' : 'unverified', ...(user ? {} : { profile: null }) }),
  setProfile: (profile) => set({ profile }),
}))
