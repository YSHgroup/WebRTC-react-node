'use client'
import type { ConfirmationResult } from 'firebase/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { CountryCode } from 'libphonenumber-js'
import { toast } from 'sonner'
import { AuthShell, Divider, FormError, GoogleMark } from '@/components/auth/AuthShell'
import { CodeStep } from '@/components/auth/CodeStep'
import { IdentifierField, PasswordField, kindOf } from '@/components/auth/IdentifierFields'
import { assertHuman, preloadCaptcha } from '@/lib/captcha'
import {
  authError, confirmPhoneCode, loginWithEmail, loginWithGoogle, resetPassword, sendPhoneCode,
} from '@/lib/firebase/authActions'
import { parsePhone } from '@/lib/phone'
import { isVerified, useAuth } from '@/store/auth'
import { useRedirectIfReady } from '@/hooks/useRedirectIfReady'

export default function LoginPage() {
  const router = useRouter()
  useRedirectIfReady()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [country, setCountry] = useState<CountryCode>('US')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null)
  const [phoneShown, setPhoneShown] = useState('')

  useEffect(() => { preloadCaptcha() }, [])
  const kind = kindOf(identifier)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setBusy(true)
    try {
      if (kind === 'phone') {
        const phone = parsePhone(identifier, country)
        if (!phone) throw new Error('Enter a valid phone number.')
        setConfirmation(await sendPhoneCode(phone.e164))
        setPhoneShown(phone.pretty)
      } else if (kind === 'email') {
        await assertHuman('login')
        const user = await loginWithEmail(identifier.trim(), password)
        useAuth.getState().sync(user)
        router.replace(isVerified(user) ? '/chat' : '/register?verify=1')
      } else {
        throw new Error('Enter an email address or a phone number.')
      }
    } catch (err) { setError(authError(err)) } finally { setBusy(false) }
  }

  const google = async () => {
    setError(null); setBusy(true)
    try { await loginWithGoogle() } catch (err) { setError(authError(err)) } finally { setBusy(false) }
  }

  const forgot = async () => {
    if (kind !== 'email') return setError('Enter your email above first, then choose "Forgot password".')
    try { await resetPassword(identifier.trim()); toast.success('Password reset email sent.') } catch (err) { setError(authError(err)) }
  }

  if (confirmation) {
    return (
      <AuthShell title="Enter your code" subtitle="One more step to sign in">
        <CodeStep
          sentTo={phoneShown}
          onBack={() => setConfirmation(null)}
          onResend={async () => { const p = parsePhone(identifier, country); if (p) setConfirmation(await sendPhoneCode(p.e164)) }}
          onSubmit={async (code) => { try { await confirmPhoneCode(confirmation, code) } catch (err) { throw new Error(authError(err)) } }}
        />
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Welcome back!"
      subtitle="Sign in to continue to your account"
      footer={<>Don’t have an account? <Link href="/register" className="font-semibold text-brand-600">Sign up</Link></>}
    >
      <form onSubmit={submit} className="space-y-3" noValidate={false}>
        <IdentifierField value={identifier} onChange={setIdentifier} country={country} onCountry={setCountry} />
        {kind !== 'phone' && <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />}
        {kind === 'phone' && <p className="text-xs text-mute">We’ll text you a one-time code — no password needed.</p>}
        {kind !== 'phone' && (
          <div className="flex justify-end text-sm">
            <button type="button" onClick={forgot} className="font-medium text-brand-600">Forgot password?</button>
          </div>
        )}
        <FormError message={error} />
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Please wait…' : kind === 'phone' ? 'Send code' : 'Sign in'}
        </button>
      </form>
      <Divider />
      <button onClick={google} disabled={busy} className="btn-ghost w-full"><GoogleMark /> Continue with Google</button>
      <p className="mt-5 text-center text-[11px] leading-snug text-mute">
        Protected by reCAPTCHA. Google’s <a className="underline" href="https://policies.google.com/privacy" rel="noopener noreferrer">Privacy Policy</a> and{' '}
        <a className="underline" href="https://policies.google.com/terms" rel="noopener noreferrer">Terms</a> apply.
      </p>
    </AuthShell>
  )
}
