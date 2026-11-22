'use client'

import { useState } from 'react'
import { firebaseAuthError, googleFirebaseIdToken } from '@/lib/firebase-auth-client'
import { GoogleMark } from './AuthShell'

export function GoogleSignInButton({ onSuccess, onError, label }: {
  onSuccess: (idToken: string) => Promise<void>
  onError: (message: string) => void
  label: string
}) {
  const [busy, setBusy] = useState(false)

  const signIn = async () => {
    setBusy(true)
    try {
      await onSuccess(await googleFirebaseIdToken())
    } catch (error) {
      onError(firebaseAuthError(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" className="btn-ghost w-full" onClick={signIn} disabled={busy}>
      <GoogleMark /> {busy ? 'Please wait…' : label}
    </button>
  )
}
