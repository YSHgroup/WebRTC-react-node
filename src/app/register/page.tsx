'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { CountryCode } from 'libphonenumber-js'
import { AuthShell, Divider, FormError, GoogleMark } from '@/components/auth/AuthShell'
import { IdentifierField, NameField, PasswordField, kindOf } from '@/components/auth/IdentifierFields'
import { assertHuman, preloadCaptcha } from '@/lib/captcha'
import {
  authError, loginWithGoogle, refreshEmailVerification,
  registerWithEmail, sendVerificationEmail,
} from '@/lib/firebase/authActions'
import { useAuth } from '@/store/auth'
import { useRedirectIfReady } from '@/hooks/useRedirectIfReady'

type Step = 'form' | 'email-code'

function RegisterForm() {
  const router = useRouter()
  const params = useSearchParams()
  const status = useRedirectIfReady()
  const user = useAuth((s) => s.user)

  const [step, setStep] = useState<Step>('form')
  const [name, setName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [country, setCountry] = useState<CountryCode>('US')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const autoSent = useRef(false)

  useEffect(() => { preloadCaptcha() }, [])

  // Arrived from /login with an account that still needs its email verified.
  useEffect(() => {
    if (params.get('verify') && status === 'unverified' && user && !autoSent.current) {
      autoSent.current = true
      setStep('email-code')
      sendVerificationEmail(user).catch((e) => setError(authError(e)))
    }
  }, [params, status, user])

  const kind = kindOf(identifier)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (name.trim().length < 2) return setError('Enter your full name.')
    setBusy(true)
    try {
      if (kind === 'phone') {
        throw new Error('Phone SMS signup requires Firebase Blaze billing. Use email instead.')
      } else if (kind === 'email') {
        await assertHuman('register')
        const created = await registerWithEmail(name.trim(), identifier.trim(), password)
        useAuth.getState().sync(created)
        autoSent.current = true
        setStep('email-code')
        try {
          await sendVerificationEmail(created)
          toast.success('Firebase verification email sent.')
        } catch (e) {
          setError(authError(e))
        }
      } else {
        throw new Error('Enter an email address or a phone number.')
      }
    } catch (err) { setError(authError(err)) } finally { setBusy(false) }
  }

  const google = async () => {
    setError(null); setBusy(true)
    try { await loginWithGoogle() } catch (err) { setError(authError(err)) } finally { setBusy(false) }
  }

  if (step === 'email-code' && user) {
    return (
      <AuthShell title="Verify your email" subtitle="Check your inbox and confirm your email address">
        <div className="space-y-3">
          <p className="text-center text-sm text-mute">
            Firebase sent a verification link to <span className="font-medium text-ink">{user.email}</span>.
          </p>
          <FormError message={error} />
          <button
            type="button"
            className="btn-primary w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setError(null)
              try {
                const verified = await refreshEmailVerification(user)
                useAuth.getState().sync(user)
                if (verified) {
                  toast.success('Email verified.')
                  router.replace('/chat')
                } else {
                  setError('Email is not verified yet. Open the link in your inbox, then try again.')
                }
              } catch (e) {
                setError(authError(e))
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Checking…' : 'I’ve verified my email'}
          </button>
          <button
            type="button"
            className="btn-ghost w-full"
            onClick={async () => {
              setError(null)
              try {
                await sendVerificationEmail(user)
                toast.success('Verification email sent again.')
              } catch (e) {
                setError(authError(e))
              }
            }}
          >
            Resend verification email
          </button>
          <button type="button" className="w-full text-sm text-mute hover:text-ink" onClick={() => setStep('form')}>
            Back
          </button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="Join us today!"
      footer={<>Already have an account? <Link href="/login" className="font-semibold text-brand-600">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-3">
        <NameField value={name} onChange={setName} />
        <IdentifierField value={identifier} onChange={setIdentifier} country={country} onCountry={setCountry} />
        {kind !== 'phone' ? (
          <PasswordField value={password} onChange={setPassword} autoComplete="new-password" />
        ) : (
          <p className="text-xs text-mute">Phone SMS signup requires Firebase Blaze billing. Use email to sign up on the free plan.</p>
        )}
        <FormError message={error} />
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Please wait…' : kind === 'phone' ? 'Send code' : 'Sign up'}
        </button>
      </form>
      <Divider />
      <button onClick={google} disabled={busy} className="btn-ghost w-full"><GoogleMark /> Sign up with Google</button>
      <p className="mt-5 text-center text-[11px] leading-snug text-mute">
        Protected by reCAPTCHA. Google’s <a className="underline" href="https://policies.google.com/privacy" rel="noopener noreferrer">Privacy Policy</a> and{' '}
        <a className="underline" href="https://policies.google.com/terms" rel="noopener noreferrer">Terms</a> apply.
      </p>
    </AuthShell>
  )
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>
}
