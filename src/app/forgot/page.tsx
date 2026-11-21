'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { toast } from 'sonner'
import { AuthShell, FormError } from '@/components/auth/AuthShell'
import { OtpInput } from '@/components/ui/OtpInput'
import { PasswordField } from '@/components/auth/IdentifierFields'
import { authError, requestPasswordReset, resetPassword } from '@/lib/auth/actions'

function ForgotForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const request = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setBusy(true)
    try { await requestPasswordReset(email.trim()); setSent(true) } catch (err) { setError(authError(err)) } finally { setBusy(false) }
  }

  const reset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setBusy(true)
    try {
      await resetPassword({ email: email.trim(), code, password })
      toast.success('Password updated. You are signed in.')
      router.replace('/chat')
    } catch (err) { setError(authError(err)) } finally { setBusy(false) }
  }

  if (!sent) {
    return (
      <AuthShell title="Forgot password?" subtitle="We will email you a 6-digit code" footer={<Link href="/login" className="font-semibold text-brand-600">Back to sign in</Link>}>
        <form onSubmit={request} className="space-y-3">
          <input className="field" type="email" placeholder="Email address" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address" required />
          <FormError message={error} />
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send code'}</button>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Choose a new password" subtitle={`If ${email} has an account, a code is on its way`} footer={<Link href="/login" className="font-semibold text-brand-600">Back to sign in</Link>}>
      <form onSubmit={reset} className="space-y-4">
        <OtpInput value={code} onChange={setCode} disabled={busy} />
        <PasswordField value={password} onChange={setPassword} autoComplete="new-password" />
        <FormError message={error} />
        <button className="btn-primary w-full" disabled={busy || code.length !== 6 || password.length < 8}>{busy ? 'Saving…' : 'Update password'}</button>
      </form>
    </AuthShell>
  )
}

export default function ForgotPage() {
  return <Suspense><ForgotForm /></Suspense>
}
