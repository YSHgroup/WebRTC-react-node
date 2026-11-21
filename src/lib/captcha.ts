'use client'

declare global {
  interface Window {
    grecaptcha?: { ready: (cb: () => void) => void; execute: (key: string, opts: { action: string }) => Promise<string> }
  }
}

// Public key; inlined at build time by Next.js. Optional: without it, bot protection relies on server rate limits.
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

/** A one-time token for the server to verify in the same request, or undefined when reCAPTCHA is not configured. */
export async function captchaToken(action: string): Promise<string | undefined> {
  if (!KEY) return undefined
  await load()
  return window.grecaptcha!.execute(KEY, { action })
}
