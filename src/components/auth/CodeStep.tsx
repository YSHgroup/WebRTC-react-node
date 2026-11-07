'use client'
import { useEffect, useState } from 'react'
import { OtpInput } from '@/components/ui/OtpInput'
import { FormError } from './AuthShell'

/** Shared "enter the 6-digit code" step for email and SMS verification. */
export function CodeStep({ sentTo, onSubmit, onResend, onBack }: {
  sentTo: string
  onSubmit: (code: string) => Promise<void>
  onResend: () => Promise<void>
  onBack: () => void
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(30)

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const submit = async (value = code) => {
    if (value.length !== 6 || busy) return
    setBusy(true); setError(null)
    try { await onSubmit(value) } catch (e) { setError((e as Error).message); setCode('') } finally { setBusy(false) }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-4">
      <p className="text-center text-sm text-mute">We sent a 6-digit code to <span className="font-medium text-ink">{sentTo}</span>.</p>
      <OtpInput value={code} onChange={(v) => { setCode(v); if (v.length === 6) submit(v) }} disabled={busy} />
      <FormError message={error} />
      <button className="btn-primary w-full" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify code'}</button>
      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onBack} className="text-mute hover:text-ink">Back</button>
        <button
          type="button"
          disabled={wait > 0}
          onClick={async () => { setWait(30); setError(null); try { await onResend() } catch (e) { setError((e as Error).message) } }}
          className="font-medium text-brand-600 disabled:text-mute"
        >
          {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
        </button>
      </div>
    </form>
  )
}
