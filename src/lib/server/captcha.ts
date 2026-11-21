import { HttpError } from './http'

/** reCAPTCHA v3, checked on the server inside the same request that registers or signs in. Skipped when no secret is configured. */
export async function verifyCaptcha(token: string | undefined, action: string) {
  const secret = process.env.RECAPTCHA_SECRET_KEY
  if (!secret) return
  if (!token) throw new HttpError(400, 'Could not confirm you are human. Reload the page and try again.')
  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
  })
  const data = (await res.json().catch(() => ({}))) as { success?: boolean; score?: number; action?: string }
  if (!data.success || (data.score ?? 0) < 0.4 || data.action !== action) {
    throw new HttpError(403, 'We could not confirm you are human. Please try again.')
  }
}
