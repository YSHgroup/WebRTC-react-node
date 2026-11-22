'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import type { CountryCode } from 'libphonenumber-js'
import { AuthShell, Divider, FormError } from '@/components/auth/AuthShell'
import { CaptchaNotice } from '@/components/auth/CaptchaNotice'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { IdentifierField, PasswordField, kindOf } from '@/components/auth/IdentifierFields'
import { authError, loginAccount, loginWithFirebase } from '@/lib/auth/actions'
import { captchaToken, preloadCaptcha } from '@/lib/captcha'
import { useRedirectIfReady } from '@/hooks/useRedirectIfReady'

function LoginForm() {
  const router = useRouter()
  useRedirectIfReady()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [country, setCountry] = useState<CountryCode>('US')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const kind = kindOf(identifier)
  useEffect(() => { if (kind === 'email') preloadCaptcha() }, [kind])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (kind === 'unknown') return setError('Enter an email address or a phone number.')
    setBusy(true)
    try {
      const user = await loginAccount({
        identifier: identifier.trim(),
        country,
        password,
        ...(kind === 'email' ? { captchaToken: await captchaToken('login') } : {}),
      })
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
      <GoogleSignInButton
        label="Continue with Google"
        onSuccess={async (idToken) => {
          const user = await loginWithFirebase(idToken)
          router.replace(user.needsVerification ? '/register?verify=1' : '/chat')
        }}
        onError={setError}
      />
      <CaptchaNotice />
    </AuthShell>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
