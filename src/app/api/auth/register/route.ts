import { z } from 'zod'
import { verifyCaptcha } from '@/lib/server/captcha'
import { sendEmailVerificationCode } from '@/lib/server/email-verification'
import { isUniqueViolation } from '@/lib/server/db'
import { verifyFirebaseIdToken } from '@/lib/server/firebase'
import { clientIp, handler, HttpError, parseBody } from '@/lib/server/http'
import { parseIdentifier } from '@/lib/server/identifier'
import { hashPassword } from '@/lib/server/password'
import { rateLimit } from '@/lib/server/ratelimit'
import { startSession } from '@/lib/server/session'
import { createUser, toMe } from '@/lib/server/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(80),
  identifier: z.string().trim().min(3, 'Enter an email address or phone number.').max(254),
  country: z.string().length(2).optional(),
  password: z.string().min(8, 'Use at least 8 characters for the password.').max(128).optional(),
  captchaToken: z.string().optional(),
  firebaseIdToken: z.string().optional(),
  verificationMethod: z.enum(['code', 'link']).default('code'),
})

export const POST = handler(async (req) => {
  const body = await parseBody(req, Body)
  await rateLimit(`register:${clientIp(req)}`, 10, 60 * 60_000)
  const id = parseIdentifier(body.identifier, body.country)
  if ('email' in id) await verifyCaptcha(body.captchaToken, 'register')
  let firebaseUid: string | undefined
  let firebaseEmailVerified = false
  let passwordHash: string | null = null
  if ('phone' in id) {
    if (!body.password) throw new HttpError(400, 'Enter a password for your phone account.')
    if (!body.firebaseIdToken) throw new HttpError(400, 'Verify your phone number before creating the account.')
    const identity = await verifyFirebaseIdToken(body.firebaseIdToken)
    if (identity.firebase?.sign_in_provider !== 'phone' || identity.phone_number !== id.phone) {
      throw new HttpError(403, 'The verification code was not for this phone number.')
    }
    firebaseUid = identity.uid
    passwordHash = await hashPassword(body.password)
  } else {
    if (!body.firebaseIdToken) throw new HttpError(400, 'Create your Firebase email account before registering.')
    const identity = await verifyFirebaseIdToken(body.firebaseIdToken)
    if (identity.firebase?.sign_in_provider !== 'password' || identity.email?.toLowerCase() !== id.email) {
      throw new HttpError(403, 'The Firebase email account does not match this registration.')
    }
    firebaseUid = identity.uid
    firebaseEmailVerified = identity.email_verified === true
  }

  let row
  try {
    row = await createUser({
      name: body.name,
      email: 'email' in id ? id.email : null,
      phone: 'phone' in id ? id.phone : null,
      passwordHash,
      firebaseUid,
      emailVerified: firebaseEmailVerified,
      phoneVerified: 'phone' in id,
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new HttpError(409, 'email' in id ? 'An account with this email already exists. Try signing in.' : 'An account with this phone number already exists. Try signing in.')
    }
    throw error
  }

  await startSession(row.id)
  const me = toMe(row)
  let verificationError: string | undefined
  if (me.needsVerification && me.email && body.verificationMethod === 'code') {
    try {
      await sendEmailVerificationCode(me.uid, me.email)
    } catch (error) {
      console.error('[register] could not send verification email', error)
      verificationError = error instanceof HttpError
        ? error.message
        : 'Your account was created, but the verification code could not be sent. Please request another code.'
    }
  }
  return { user: me, verificationError }
})
