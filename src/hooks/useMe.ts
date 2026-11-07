'use client'
import { useAuth } from '@/store/auth'

export function useMe() {
  const user = useAuth((s) => s.user)
  const profile = useAuth((s) => s.profile)
  return {
    uid: user?.uid ?? '',
    name: profile?.displayName ?? user?.displayName ?? 'You',
    email: profile?.email ?? user?.email ?? null,
    phone: profile?.phone ?? user?.phoneNumber ?? null,
    photo: profile?.photoURL ?? user?.photoURL ?? null,
    profile,
  }
}
