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
import { authError, loginWithFirebase, registerAccount, sendEmailVerification, verifyEmailCode, verifyPhoneAccount, logout } from '@/lib/auth/actions'
import { captchaToken, preloadCaptcha } from '@/lib/captcha'
import { useRedirectIfReady } from '@/hooks/useRedirectIfReady'
import { useAuth } from '@/store/auth'

type Step = 'form' | 'phone' | 'verify-email' | 'verify-phone'
type VerificationMethod = 'code' | 'link'

function VerificationMethodChoice({ value, onChange }: {
  value: VerificationMethod
  onChange: (method: VerificationMethod) => void
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium text-ink">Choose how to verify your email</legend>
      {([
        ['code', '6-digit code', 'Enter a code from your email'],
        ['link', 'Verification link', 'Click a link in your email'],
      ] as const).map(([method, title, description]) => (
        <label key={method} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3">
          <input
            type="radio"
            name="email-verification-method"
            value={method}
            checked={value === method}
            onChange={() => onChange(method)}
            className="mt-1 accent-brand-600"
          />
          <span>
            <span className="block text-sm font-medium text-ink">{title}</span>
            <span className="block text-xs text-mute">{description}</span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}

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
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>('code')
  const [sentMethod, setSentMethod] = useState<VerificationMethod | null>(null)
  const verificationStepSet = useRef(false)

  // Signed in but the email is not verified yet (sent here from login or the workspace).
  useEffect(() => {
    if (params.get('verify') && status === 'unverified' && me && !verificationStepSet.current) {
      verificationStepSet.current = true
      if (me.phone && !me.phoneVerified) {
        setPhoneToVerify(me.phone)
        setStep('verify-phone')
      } else {
        setStep('verify-email')
        setSentMethod(null)
      }
    }
  }, [params, status, me])

  const kind = kindOf(identifier)
  useEffect(() => { if (kind === 'email') preloadCaptcha() }, [kind])

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const selectedMethod = formData.get('email-verification-method')
    const selectedVerificationMethod: VerificationMethod =
      selectedMethod === 'link' ? 'link' : 'code'
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
      const result = await registerAccount({
        name: name.trim(),
        identifier: identifier.trim(),
        country,
        password,
        verificationMethod: selectedVerificationMethod,
        captchaToken: await captchaToken('register'),
      })
      const user = result.user
      if (user.needsVerification) {
        setError(result.verificationError ?? null)
        setSentMethod(result.verificationError ? null : selectedVerificationMethod)
        setStep('verify-email')
      } else router.replace('/chat')
    } catch (err) { setError(authError(err)) } finally { setBusy(false) }
  }

  const requestVerification = async (method: VerificationMethod) => {
    setBusy(true)
    setError(null)
    try {
      await sendEmailVerification(method)
      setSentMethod(method)
      toast.success(method === 'code' ? 'A new code is on its way.' : 'A verification link is on its way.')
    } catch (err) {
      const message = authError(err)
      setError(message)
      throw new Error(message)
    } finally {
      setBusy(false)
    }
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
        <div className="space-y-4">
          <VerificationMethodChoice
            value={verificationMethod}
            onChange={(method) => {
              setVerificationMethod(method)
              setSentMethod(null)
              setError(null)
            }}
          />
          {sentMethod === 'code' && verificationMethod === 'code' ? (
            <CodeStep
              sentTo={me.email ?? 'your email'}
              onBack={() => { logout() }}
              onResend={() => requestVerification('code')}
              onSubmit={async (code) => {
                try { await verifyEmailCode(code) } catch (e) { throw new Error(authError(e)) }
                toast.success('Email verified.')
                router.replace('/chat')
              }}
            />
          ) : sentMethod === 'link' && verificationMethod === 'link' ? (
            <>
              <p role="status" className="text-center text-sm text-mute">
                We sent a verification link to <span className="font-medium text-ink">{me.email}</span>.
                Open it within 10 minutes to verify your account. Check your spam folder if it doesn’t arrive.
              </p>
              <FormError message={error} />
              <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => { void requestVerification('link').catch(() => {}) }}>
                {busy ? 'Sending…' : 'Resend verification link'}
              </button>
              <button type="button" className="w-full text-sm text-mute hover:text-ink" onClick={() => { logout() }}>
                Back
              </button>
            </>
          ) : (
            <>
              <FormError message={error} />
              <button
                type="button"
                className="btn-primary w-full"
                disabled={busy}
                onClick={() => { void requestVerification(verificationMethod).catch(() => {}) }}
              >
                {busy ? 'Sending…' : `Send verification ${verificationMethod}`}
              </button>
              <button type="button" className="w-full text-sm text-mute hover:text-ink" onClick={() => { logout() }}>
                Back
              </button>
            </>
          )}
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
        <PasswordField value={password} onChange={setPassword} autoComplete="new-password" />
        {kind === 'email' && (
          <VerificationMethodChoice value={verificationMethod} onChange={setVerificationMethod} />
        )}
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
