'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'
import { toast } from 'sonner'
import { AuthShell, Divider, FormError } from '@/components/auth/AuthShell'
import { CaptchaNotice } from '@/components/auth/CaptchaNotice'
import { CodeStep } from '@/components/auth/CodeStep'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { IdentifierField, NameField, PasswordField, kindOf } from '@/components/auth/IdentifierFields'
import { PhoneCodeStep } from '@/components/auth/PhoneCodeStep'
import { authError, loginWithFirebase, registerAccount, sendEmailCode, verifyEmailCode, verifyPhoneAccount, logout } from '@/lib/auth/actions'
import { captchaToken, preloadCaptcha } from '@/lib/captcha'
import { useRedirectIfReady } from '@/hooks/useRedirectIfReady'
import { useAuth } from '@/store/auth'

type Step = 'form' | 'phone' | 'verify-email' | 'verify-phone'

function RegisterForm() {
  const router = useRouter()
  const params = useSearchParams()
  const status = useRedirectIfReady()
  const me = useAuth((s) => s.me)

  const [step, setStep] = useState<Step>('form')
  const [name, setName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [phoneToVerify, setPhoneToVerify] = useState('')
  const [country, setCountry] = useState<CountryCode>('US')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const autoSent = useRef(false)

  // Signed in but the email is not verified yet (sent here from login or the workspace).
  useEffect(() => {
    if (params.get('verify') && status === 'unverified' && me && !autoSent.current) {
      autoSent.current = true
      if (me.phone && !me.phoneVerified) {
        setPhoneToVerify(me.phone)
        setStep('verify-phone')
      } else {
        setStep('verify-email')
        sendEmailCode().catch((e) => setError(authError(e)))
      }
    }
  }, [params, status, me])

  const kind = kindOf(identifier)
  useEffect(() => { if (kind === 'email') preloadCaptcha() }, [kind])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (kind === 'unknown') return setError('Enter an email address or a phone number.')
    if (kind === 'phone') {
      const parsed = parsePhoneNumberFromString(identifier, country)
      if (!parsed?.isValid()) return setError('Enter a valid phone number including its country code.')
      setPhoneToVerify(parsed.number)
      setStep('phone')
      return
    }
    setBusy(true)
    try {
      const result = await registerAccount({ name: name.trim(), identifier: identifier.trim(), country, password, captchaToken: await captchaToken('register') })
      const user = result.user
      if (user.needsVerification) {
        autoSent.current = true
        setError(result.verificationError ?? null)
        setStep('verify-email')
      } else router.replace('/chat')
    } catch (err) { setError(authError(err)) } finally { setBusy(false) }
  }

  if (step === 'phone') {
    return (
      <AuthShell title="Verify your phone" subtitle="We’ll text a code before creating your account">
        <PhoneCodeStep
          phone={phoneToVerify}
          onBack={() => setStep('form')}
          onVerify={async (firebaseIdToken) => {
            const result = await registerAccount({
              name: name.trim(),
              identifier: phoneToVerify,
              country,
              password,
              firebaseIdToken,
            })
            if (result.user.needsVerification) throw new Error('Phone verification did not complete. Please try again.')
            router.replace('/chat')
          }}
        />
      </AuthShell>
    )
  }

  if (step === 'verify-phone' && me?.phone) {
    return (
      <AuthShell title="Verify your phone" subtitle="Enter the code we text to finish signing in">
        <PhoneCodeStep
          phone={me.phone}
          onBack={() => { logout() }}
          onVerify={async (idToken) => {
            await verifyPhoneAccount(idToken)
            toast.success('Phone number verified.')
            router.replace('/chat')
          }}
        />
      </AuthShell>
    )
  }

  if (step === 'verify-email' && me) {
    return (
      <AuthShell title="Verify your email" subtitle="One more step to finish creating your account">
        <CodeStep
          sentTo={me.email ?? 'your email'}
          sent={!error}
          onBack={() => { logout() }}
          onResend={async () => { await sendEmailCode(); setError(null); toast.success('A new code is on its way.') }}
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
          <p className="text-xs text-mute">We’ll verify your phone number by SMS before creating your account.</p>
        )}
        <FormError message={error} />
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : 'Sign up'}</button>
      </form>
      <Divider />
      <GoogleSignInButton
        label="Sign up with Google"
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

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>
}
