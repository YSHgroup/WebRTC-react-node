'use client'

import { useEffect, useState } from 'react'
import { getCaptchaSiteKey } from '@/lib/captcha'

export function CaptchaNotice() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    getCaptchaSiteKey().then((key) => setEnabled(!!key)).catch(() => setEnabled(false))
  }, [])

  if (!enabled) return null
  return (
    <p className="mt-5 text-center text-[11px] leading-snug text-mute">
      Protected by reCAPTCHA. Google’s <a className="underline" href="https://policies.google.com/privacy" rel="noopener noreferrer">Privacy Policy</a> and{' '}
      <a className="underline" href="https://policies.google.com/terms" rel="noopener noreferrer">Terms</a> apply.
    </p>
  )
}
