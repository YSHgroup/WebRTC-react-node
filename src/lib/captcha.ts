'use client'

declare global {
  interface Window {
    grecaptcha?: { ready: (cb: () => void) => void; execute: (key: string, opts: { action: string }) => Promise<string> }
  }
}

let siteKeyRequest: Promise<string | undefined> | null = null
let loading: Promise<void> | null = null

export function getCaptchaSiteKey(): Promise<string | undefined> {
  if (!siteKeyRequest) {
    siteKeyRequest = fetch('/api/auth/captcha', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Could not load reCAPTCHA configuration.')
        const data = (await res.json()) as { siteKey?: unknown }
        return typeof data.siteKey === 'string' && data.siteKey ? data.siteKey : undefined
      })
      .catch((error: unknown) => {
        siteKeyRequest = null
        throw error
      })
  }
  return siteKeyRequest
}

async function load(): Promise<string | undefined> {
  const key = await getCaptchaSiteKey()
  if (!key) return undefined
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script')
      s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(key)}`
      s.async = true
      s.onload = () => {
        if (!window.grecaptcha) return reject(new Error('Could not initialize reCAPTCHA'))
        window.grecaptcha.ready(resolve)
      }
      s.onerror = () => reject(new Error('Could not load reCAPTCHA'))
      document.head.appendChild(s)
    })
  }
  try { await loading } catch (error) {
    loading = null
    throw error
  }
  return key
}

export const preloadCaptcha = () => { void load().catch(() => {}) }

/** A one-time token for the server to verify in the same request, or undefined when reCAPTCHA is not configured. */
export async function captchaToken(action: string): Promise<string | undefined> {
  const key = await load()
  if (!key) return undefined
  if (!window.grecaptcha) throw new Error('Could not initialize reCAPTCHA')
  return window.grecaptcha.execute(key, { action })
}
