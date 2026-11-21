import { create } from 'zustand'
import type { Me } from '@/lib/types'

export type AuthStatus = 'loading' | 'out' | 'unverified' | 'ready'

interface AuthState {
  me: Me | null
  status: AuthStatus
  /** Applies a server response ({user: Me | null}) to the store. */
  setUser: (me: Me | null) => void
  signedOut: () => void
  needsVerification: () => void
}

export const useAuth = create<AuthState>((set) => ({
  me: null,
  status: 'loading',
  setUser: (me) => set({ me, status: !me ? 'out' : me.needsVerification ? 'unverified' : 'ready' }),
  signedOut: () => set({ me: null, status: 'out' }),
  needsVerification: () => set((s) => ({ status: s.me ? 'unverified' : s.status })),
}))
