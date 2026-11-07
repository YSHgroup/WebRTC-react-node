'use client'
import { onAuthStateChanged } from 'firebase/auth'
import { useEffect } from 'react'
import { auth } from '@/lib/firebase/client'
import { useAuth } from '@/store/auth'

/** Mirrors Firebase Auth into the store. Mounted once in the root layout. */
export function AuthListener() {
  useEffect(() => onAuthStateChanged(auth, (u) => useAuth.getState().sync(u)), [])
  return null
}
