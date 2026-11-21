'use client'
import { useEffect } from 'react'
import { api } from '@/lib/api'
import type { Me } from '@/lib/types'
import { useAuth } from '@/store/auth'

/** Asks the server who is signed in. Mounted once in the root layout. */
export function AuthListener() {
  useEffect(() => {
    let cancelled = false
    api<{ user: Me | null }>('/api/auth/me')
      .then((r) => { if (!cancelled) useAuth.getState().setUser(r.user) })
      .catch(() => { if (!cancelled) useAuth.getState().signedOut() })
    return () => { cancelled = true }
  }, [])
  return null
}
