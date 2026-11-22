'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import type { CountryCode } from 'libphonenumber-js'
import { AuthShell, Divider, FormError, GoogleMark } from '@/components/auth/AuthShell'
import { CaptchaNotice } from '@/components/auth/CaptchaNotice'
import { IdentifierField, PasswordField, kindOf } from '@/components/auth/IdentifierFields'
import { authError, loginAccount } from '@/lib/auth/actions'
import { captchaToken, preloadCaptcha } from '@/lib/captcha'
import { useRedirectIfReady } from '@/hooks/useRedirectIfReady'

const GOOGLE_ERRORS: Record<string, string> = {
  google_not_configured: 'Google sign-in is not set up on this site yet.',
  google_cancelled: 'Google sign-in was cancelled.',
  google_state: 'The Google sign-in session expired. Please try again.',
  google_unverified: 'Your Google account email is not verified.',
  google_failed: 'Google sign-in failed. Please try again.',
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  useRedirectIfReady()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [country, setCountry] = useState<CountryCode>('US')
  const [error, setError] = useState<string | null>(GOOGLE_ERRORS[params.get('error') ?? ''] ?? null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { preloadCaptcha() }, [])
  const kind = kindOf(identifier)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (kind === 'unknown') return setError('Enter an email address or a phone number.')
    setBusy(true)
    try {
      const user = await loginAccount({ identifier: identifier.trim(), country, password, captchaToken: await captchaToken('login') })
      router.replace(user.needsVerification ? '/register?verify=1' : '/chat')
    } catch (err) { setError(authError(err)) } finally { setBusy(false) }
  }

  return (
    <AuthShell
      title="Welcome back!"
      subtitle="Sign in to continue to your account"
      footer={<>Don’t have an account? <Link href="/register" className="font-semibold text-brand-600">Sign up</Link></>}
    >
      <form onSubmit={submit} className="space-y-3">
        <IdentifierField value={identifier} onChange={setIdentifier} country={country} onCountry={setCountry} />
        <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />
        <div className="flex justify-end text-sm">
          <Link href={`/forgot${kind === 'email' ? `?email=${encodeURIComponent(identifier.trim())}` : ''}`} className="font-medium text-brand-600">Forgot password?</Link>
        </div>
        <FormError message={error} />
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : 'Sign in'}</button>
      </form>
      <Divider />
      <a href="/api/auth/google" className="btn-ghost w-full"><GoogleMark /> Continue with Google</a>
      <CaptchaNotice />
    </AuthShell>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
