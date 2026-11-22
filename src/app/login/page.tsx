'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import type { CountryCode } from 'libphonenumber-js'
import { toast } from 'sonner'
import { AuthShell, Divider, FormError } from '@/components/auth/AuthShell'
import { CaptchaNotice } from '@/components/auth/CaptchaNotice'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { IdentifierField, PasswordField, kindOf } from '@/components/auth/IdentifierFields'
import { authError, loginAccount, loginEmailWithFirebase, loginWithFirebase } from '@/lib/auth/actions'
import { createEmailPasswordIdToken, firebaseAuthError, signInEmailPasswordIdToken } from '@/lib/firebase-auth-client'
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
      const captcha = kind === 'email' ? await captchaToken('login') : undefined
      if (kind === 'email') {
        try {
          const idToken = await signInEmailPasswordIdToken(identifier.trim(), password)
          const user = await loginEmailWithFirebase(idToken, captcha ?? '')
          router.replace(user.needsVerification ? '/register?verify=1' : '/chat')
          return
        } catch (firebaseError) {
          try {
            const user = await loginAccount({
              identifier: identifier.trim(),
              country,
              password,
              captchaToken: captcha,
            })
            try {
              const firebaseIdToken = await createEmailPasswordIdToken(identifier.trim(), password)
              await loginEmailWithFirebase(firebaseIdToken, await captchaToken('login'))
            } catch (migrationError) {
              console.error('[auth] could not link the existing email account to Firebase', migrationError)
              toast.error('Signed in, but Firebase email sign-in could not be linked. Email verification links may not work; use the code option or contact support.')
            }
            router.replace(user.needsVerification ? '/register?verify=1' : '/chat')
            return
          } catch (legacyError) {
            if (firebaseError instanceof Error && !('code' in firebaseError)) {
              throw legacyError
            }
            throw new Error(firebaseAuthError(firebaseError))
          }
        }
      }
      const user = await loginAccount({
        identifier: identifier.trim(),
        country,
        password,
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
