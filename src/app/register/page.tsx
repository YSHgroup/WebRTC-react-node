'use client'
import type { ConfirmationResult } from 'firebase/auth'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import type { CountryCode } from 'libphonenumber-js'
import { AuthShell, Divider, FormError, GoogleMark } from '@/components/auth/AuthShell'
import { CodeStep } from '@/components/auth/CodeStep'
import { IdentifierField, NameField, PasswordField, kindOf } from '@/components/auth/IdentifierFields'
import { assertHuman, preloadCaptcha } from '@/lib/captcha'
import {
  authError, confirmPhoneCode, loginWithGoogle, registerWithEmail, sendEmailCode, sendPhoneCode, verifyEmailCode,
} from '@/lib/firebase/authActions'
import { parsePhone } from '@/lib/phone'
import { useAuth } from '@/store/auth'
import { useRedirectIfReady } from '@/hooks/useRedirectIfReady'

type Step = 'form' | 'email-code' | 'phone-code'

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
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null)
  const [phoneShown, setPhoneShown] = useState('')
  const autoSent = useRef(false)

  useEffect(() => { preloadCaptcha() }, [])

  // Arrived from /login with an account that still needs its email verified.
  useEffect(() => {
    if (params.get('verify') && status === 'unverified' && user && !autoSent.current) {
      autoSent.current = true
      setStep('email-code')
      sendEmailCode(user).catch((e) => setError((e as Error).message))
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
        const phone = parsePhone(identifier, country)
        if (!phone) throw new Error('Enter a valid phone number.')
        setConfirmation(await sendPhoneCode(phone.e164))
        setPhoneShown(phone.pretty)
        setStep('phone-code')
      } else if (kind === 'email') {
        await assertHuman('register')
        const created = await registerWithEmail(name.trim(), identifier.trim(), password)
        useAuth.getState().sync(created)
        autoSent.current = true
        await sendEmailCode(created)
        setStep('email-code')
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
      <AuthShell title="Verify your email" subtitle="Enter the code to finish creating your account">
        <CodeStep
          sentTo={user.email ?? 'your email'}
          onBack={() => setStep('form')}
          onResend={() => sendEmailCode(user)}
          onSubmit={async (code) => {
            await verifyEmailCode(user, code)
            useAuth.getState().sync(user)
            router.replace('/chat')
          }}
        />
      </AuthShell>
    )
  }

  if (step === 'phone-code' && confirmation) {
    return (
      <AuthShell title="Verify your phone" subtitle="Enter the code we texted you">
        <CodeStep
          sentTo={phoneShown}
          onBack={() => setStep('form')}
          onResend={async () => { const p = parsePhone(identifier, country); if (p) setConfirmation(await sendPhoneCode(p.e164)) }}
          onSubmit={async (code) => { try { await confirmPhoneCode(confirmation, code, name.trim()) } catch (e) { throw new Error(authError(e)) } }}
        />
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
          <p className="text-xs text-mute">We’ll text you a one-time code. Phone accounts sign in with a code each time.</p>
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
