'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CodeStep } from '@/components/auth/CodeStep'
import { FormError } from '@/components/auth/AuthShell'
import { firebaseAuthError, requestPhoneCode } from '@/lib/firebase-auth-client'

type PhoneChallenge = Awaited<ReturnType<typeof requestPhoneCode>>

export function PhoneCodeStep({ phone, onVerify, onBack }: {
  phone: string
  onVerify: (idToken: string) => Promise<void>
  onBack: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const challengeRef = useRef<PhoneChallenge | null>(null)
  const [sending, setSending] = useState(true)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendCode = useCallback(async () => {
    if (!containerRef.current) throw new Error('Phone verification is not ready. Reload the page and try again.')
    setSending(true)
    setError(null)
    setSent(false)
    try {
      challengeRef.current?.clear()
      challengeRef.current = await requestPhoneCode(phone, containerRef.current)
      setSent(true)
    } catch (cause) {
      const message = firebaseAuthError(cause)
      setError(message)
      throw new Error(message)
    } finally {
      setSending(false)
    }
  }, [phone])

  useEffect(() => {
    const timer = setTimeout(() => { void sendCode().catch(() => {}) }, 0)
    return () => {
      clearTimeout(timer)
      challengeRef.current?.clear()
      challengeRef.current = null
    }
  }, [sendCode])

  const verifyCode = async (code: string) => {
    if (!challengeRef.current) throw new Error('Request a new verification code first.')
    const challenge = challengeRef.current
    const credential = await challenge.confirmation.confirm(code).catch((cause: unknown) => {
      throw new Error(firebaseAuthError(cause))
    })
    challenge.clear()
    challengeRef.current = null
    await onVerify(await credential.user.getIdToken())
  }

  return (
    <div className="space-y-4">
      <div ref={containerRef} />
      {sending && <p className="text-center text-sm text-mute">Sending a verification code…</p>}
      {error && <FormError message={error} />}
      {error && !sent && (
        <button type="button" className="btn-ghost w-full" onClick={() => { void sendCode().catch(() => {}) }} disabled={sending}>
          Try sending the code again
        </button>
      )}
      {sent && challengeRef.current && (
        <CodeStep
          sentTo={phone}
          onSubmit={verifyCode}
          onResend={sendCode}
          onBack={onBack}
        />
      )}
    </div>
  )
}
