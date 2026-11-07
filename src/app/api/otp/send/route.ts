import { createHash, randomInt } from 'crypto'
import { NextResponse } from 'next/server'
import { adminDb, verifyRequest } from '@/lib/server/admin'

export const runtime = 'nodejs'

const hash = (code: string, uid: string) =>
  createHash('sha256').update(`${code}:${uid}:${process.env.OTP_SECRET ?? ''}`).digest('hex')

async function sendEmail(to: string, code: string) {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    if (process.env.NODE_ENV === 'production') throw new Error('Email delivery is not configured')
    console.log(`\n[huddle] verification code for ${to}: ${code}\n`)
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.MAIL_FROM ?? 'Huddle <onboarding@resend.dev>',
      to,
      subject: `${code} is your Huddle verification code`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:auto;padding:24px">
        <h2 style="margin:0 0 8px">Verify your email</h2>
        <p style="color:#555">Enter this code in Huddle. It expires in 10 minutes.</p>
        <p style="font-size:34px;letter-spacing:8px;font-weight:700;color:#5B35F0;margin:16px 0">${code}</p>
        <p style="color:#888;font-size:12px">If you didn't create an account, you can ignore this email.</p></div>`,
    }),
  })
  if (!res.ok) throw new Error('Could not send the email')
}

export async function POST(req: Request) {
  let decoded
  try { decoded = await verifyRequest(req) } catch { return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 }) }
  if (!decoded.email) return NextResponse.json({ error: 'This account has no email address.' }, { status: 400 })

  const ref = adminDb().collection('otps').doc(decoded.uid)
  const existing = await ref.get()
  if (existing.exists && Date.now() - (existing.data()!.lastSentAt as number) < 30_000) {
    return NextResponse.json({ error: 'Please wait 30 seconds before asking for another code.' }, { status: 429 })
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  await ref.set({ hash: hash(code, decoded.uid), expiresAt: Date.now() + 10 * 60_000, attempts: 0, lastSentAt: Date.now() })
  try {
    await sendEmail(decoded.email, code)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
