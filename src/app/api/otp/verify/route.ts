import { createHash, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { adminAuth, adminDb, verifyRequest } from '@/lib/server/admin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  let decoded
  try { decoded = await verifyRequest(req) } catch { return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 }) }

  const { code } = (await req.json().catch(() => ({}))) as { code?: string }
  if (!code || !/^\d{6}$/.test(code)) return NextResponse.json({ error: 'Enter the 6-digit code.' }, { status: 400 })

  const ref = adminDb().collection('otps').doc(decoded.uid)
  const snap = await ref.get()
  if (!snap.exists) return NextResponse.json({ error: 'Request a new code first.' }, { status: 400 })
  const data = snap.data()!

  if (Date.now() > (data.expiresAt as number)) return NextResponse.json({ error: 'That code expired. Request a new one.' }, { status: 400 })
  if ((data.attempts as number) >= 5) return NextResponse.json({ error: 'Too many attempts. Request a new code.' }, { status: 429 })

  const given = createHash('sha256').update(`${code}:${decoded.uid}:${process.env.OTP_SECRET ?? ''}`).digest()
  const stored = Buffer.from(data.hash as string, 'hex')
  if (given.length !== stored.length || !timingSafeEqual(given, stored)) {
    await ref.update({ attempts: (data.attempts as number) + 1 })
    return NextResponse.json({ error: 'Incorrect code. Try again.' }, { status: 400 })
  }

  await adminAuth().updateUser(decoded.uid, { emailVerified: true })
  await ref.delete()
  return NextResponse.json({ ok: true })
}
