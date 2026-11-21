'use client'
import { useAuth } from '@/store/auth'

export function useMe() {
  const me = useAuth((s) => s.me)
  return {
    uid: me?.uid ?? '',
    name: me?.displayName ?? 'You',
    email: me?.email ?? null,
    phone: me?.phone ?? null,
    photo: me?.photoURL ?? null,
    profile: me,
  }
}
