'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/store/auth'

/** Sends signed-in, verified people straight to the app. */
export function useRedirectIfReady() {
  const status = useAuth((s) => s.status)
  const router = useRouter()
  useEffect(() => { if (status === 'ready') router.replace('/chat') }, [status, router])
  return status
}
