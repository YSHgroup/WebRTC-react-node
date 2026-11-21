import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { getSql } from './db'
import { HttpError } from './http'
import { SESSION_COOKIE } from '@/lib/session-constants'
import { toMe, type Me } from './users'

const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function secretKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET is missing or shorter than 32 characters. Generate one with: openssl rand -base64 48')
  }
  return new TextEncoder().encode(secret)
}

export async function startSession(uid: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(uid)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey())
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
}

export function endSession() {
  cookies().set(SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 })
}

export async function readSessionUid(): Promise<string | null> {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] })
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

/**
 * Loads the signed-in person from the database on every call, so deleted accounts lose access immediately.
 * Throws 401 when signed out, and 403 "unverified" when email verification is enforced and still pending.
 */
export async function requireUser(opts: { allowUnverified?: boolean } = {}): Promise<Me> {
  const uid = await readSessionUid()
  if (!uid) throw new HttpError(401, 'Please sign in.', 'unauthenticated')
  const rows = await getSql()`SELECT * FROM users WHERE id = ${uid}`
  if (!rows[0]) {
    endSession()
    throw new HttpError(401, 'Please sign in again.', 'unauthenticated')
  }
  const me = toMe(rows[0])
  if (!opts.allowUnverified && me.needsVerification) {
    throw new HttpError(403, 'Verify your email address to continue.', 'unverified')
  }
  return me
}
