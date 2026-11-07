'use client'

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void
      execute: (key: string, opts: { action: string }) => Promise<string>
    }
  }
}

const KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
let loading: Promise<void> | null = null

function load() {
  if (!KEY) return Promise.resolve()
  if (loading) return loading
  loading = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = `https://www.google.com/recaptcha/api.js?render=${KEY}`
    s.async = true
    s.onload = () => window.grecaptcha?.ready(resolve)
    s.onerror = () => reject(new Error('Could not load reCAPTCHA'))
    document.head.appendChild(s)
  })
  return loading
}

export const preloadCaptcha = () => { load().catch(() => {}) }

/** Returns a reCAPTCHA v3 token for the action, or '' when no site key is configured (local dev). */
export async function getCaptchaToken(action: string): Promise<string> {
  if (!KEY) return ''
  await load()
  return window.grecaptcha!.execute(KEY, { action })
}

/** Verifies the token on the server. Throws a readable error if the check fails. */
export async function assertHuman(action: string) {
  const token = await getCaptchaToken(action)
  const res = await fetch('/api/captcha', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, action }),
  })
  if (!res.ok) throw new Error('We could not confirm you are human. Please try again.')
}
