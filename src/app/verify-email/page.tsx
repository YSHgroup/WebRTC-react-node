'use client'

import Link from 'next/link'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AuthShell, FormError } from '@/components/auth/AuthShell'
import { verifyEmailLink } from '@/lib/auth/actions'

function VerifyEmailLinkForm() {
  const params = useSearchParams()
  const uid = params.get('uid') ?? ''
  const token = params.get('token') ?? ''
  const [busy, setBusy] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const verify = async () => {
    setBusy(true)
    setError(null)
    try {
      await verifyEmailLink(uid, token)
      setVerified(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not verify this email. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title={verified ? 'Email verified' : 'Verify your email'}
      subtitle={verified ? 'Your Huddle account is ready.' : 'Confirm that this email address belongs to you.'}
    >
      {verified ? (
        <Link href="/login" className="btn-primary block w-full text-center">Continue to Huddle</Link>
      ) : (
        <div className="space-y-4">
          {error && <FormError message={error} />}
          {!uid || !token ? (
            <FormError message="This verification link is incomplete. Request a new one from the sign-in page." />
          ) : (
            <button type="button" className="btn-primary w-full" disabled={busy} onClick={verify}>
              {busy ? 'Verifying…' : 'Verify email'}
            </button>
          )}
          <Link href="/register?verify=1" className="block text-center text-sm text-brand-600">
            Sign in to request a new verification email
          </Link>
        </div>
      )}
    </AuthShell>
  )
}

export default function VerifyEmailPage() {
  return <Suspense><VerifyEmailLinkForm /></Suspense>
}
