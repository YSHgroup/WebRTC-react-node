import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/** Verifies a reCAPTCHA v3 token. Without RECAPTCHA_SECRET_KEY (local dev) it lets everything through. */
export async function POST(req: Request) {
  const secret = process.env.RECAPTCHA_SECRET_KEY
  if (!secret) return NextResponse.json({ ok: true, skipped: true })

  const { token, action } = (await req.json().catch(() => ({}))) as { token?: string; action?: string }
  if (!token) return NextResponse.json({ ok: false }, { status: 400 })

  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
  })
  const data = (await res.json()) as { success: boolean; score?: number; action?: string }
  const pass = data.success && (data.score ?? 0) >= 0.5 && (!action || data.action === action)
  return NextResponse.json({ ok: pass }, { status: pass ? 200 : 403 })
}
