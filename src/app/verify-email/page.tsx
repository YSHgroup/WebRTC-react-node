'use client'

import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AuthShell, FormError } from '@/components/auth/AuthShell'
import { verifyEmailLink } from '@/lib/auth/actions'

function VerifyEmailLinkForm() {
  const params = useSearchParams()
  const uid = params.get('uid') ?? ''
  const [busy, setBusy] = useState(true)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const verify = useCallback(async () => {
    if (!uid) {
      setBusy(false)
      setError('This verification link is incomplete. Request a new one from the sign-in page.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await verifyEmailLink(uid)
      setVerified(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not verify this email. Please try again.')
    } finally {
      setBusy(false)
    }
  }, [uid])

  useEffect(() => { void verify() }, [verify])

  return (
    <AuthShell
      title={verified ? 'Email verified' : 'Verify your email'}
      subtitle={verified ? 'Your Huddle account is ready.' : 'Confirm that this email address belongs to you.'}
    >
      {verified ? (
        <Link href="/login" className="btn-primary block w-full text-center">Continue to Huddle</Link>
      ) : (
        <div className="space-y-4">
          {busy && <p role="status" className="text-center text-sm text-mute">Confirming your email verification…</p>}
          {error && <FormError message={error} />}
          {error && uid && (
            <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => { void verify() }}>
              {busy ? 'Checking…' : 'Try again'}
            </button>
          )}
          <Link href="/register?verify=1" className="block text-center text-sm text-brand-600">
            Go to sign in
          </Link>
        </div>
      )}
    </AuthShell>
  )
}

export default function VerifyEmailPage() {
  return <Suspense><VerifyEmailLinkForm /></Suspense>
}
