'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { CountryCode } from 'libphonenumber-js'
import { AuthShell, Divider, FormError, GoogleMark } from '@/components/auth/AuthShell'
import { CaptchaNotice } from '@/components/auth/CaptchaNotice'
import { CodeStep } from '@/components/auth/CodeStep'
import { IdentifierField, NameField, PasswordField, kindOf } from '@/components/auth/IdentifierFields'
import { authError, registerAccount, sendEmailCode, verifyEmailCode, logout } from '@/lib/auth/actions'
import { captchaToken, preloadCaptcha } from '@/lib/captcha'
import { useRedirectIfReady } from '@/hooks/useRedirectIfReady'
import { useAuth } from '@/store/auth'

type Step = 'form' | 'verify'

function RegisterForm() {
  const router = useRouter()
  const params = useSearchParams()
  const status = useRedirectIfReady()
  const me = useAuth((s) => s.me)

  const [step, setStep] = useState<Step>('form')
  const [name, setName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [country, setCountry] = useState<CountryCode>('US')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const autoSent = useRef(false)

  useEffect(() => { preloadCaptcha() }, [])

  // Signed in but the email is not verified yet (sent here from login or the workspace).
  useEffect(() => {
    if (params.get('verify') && status === 'unverified' && me && !autoSent.current) {
      autoSent.current = true
      setStep('verify')
      sendEmailCode().catch((e) => setError(authError(e)))
    }
  }, [params, status, me])

  const kind = kindOf(identifier)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (kind === 'unknown') return setError('Enter an email address or a phone number.')
    setBusy(true)
    try {
      const user = await registerAccount({ name: name.trim(), identifier: identifier.trim(), country, password, captchaToken: await captchaToken('register') })
      if (user.needsVerification) {
        autoSent.current = true // the server already emailed the code
        setStep('verify')
      } else router.replace('/chat')
    } catch (err) { setError(authError(err)) } finally { setBusy(false) }
  }

  if (step === 'verify' && me) {
    return (
      <AuthShell title="Verify your email" subtitle="One more step to finish creating your account">
        <CodeStep
          sentTo={me.email ?? 'your email'}
          onBack={() => { logout() }}
          onResend={async () => { await sendEmailCode(); toast.success('A new code is on its way.') }}
          onSubmit={async (code) => {
            try { await verifyEmailCode(code) } catch (e) { throw new Error(authError(e)) }
            toast.success('Email verified.')
            router.replace('/chat')
          }}
        />
        <FormError message={error} />
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
        <PasswordField value={password} onChange={setPassword} autoComplete="new-password" />
        {kind === 'phone' && (
          <p className="text-xs text-mute">Phone numbers work as your sign-in name. SMS verification is not available on the free setup, so the number is saved unverified.</p>
        )}
        <FormError message={error} />
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : 'Sign up'}</button>
      </form>
      <Divider />
      <a href="/api/auth/google" className="btn-ghost w-full"><GoogleMark /> Sign up with Google</a>
      <CaptchaNotice />
    </AuthShell>
  )
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>
}
