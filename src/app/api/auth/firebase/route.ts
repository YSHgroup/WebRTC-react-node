import { z } from 'zod'
import { getSql, isUniqueViolation } from '@/lib/server/db'
import { markFirebaseEmailVerified, verifyFirebaseIdToken } from '@/lib/server/firebase'
import { verifyCaptcha } from '@/lib/server/captcha'
import { clientIp, handler, HttpError, parseBody } from '@/lib/server/http'
import { rateLimit } from '@/lib/server/ratelimit'
import { startSession } from '@/lib/server/session'
import { createUser, findByIdentifier, toMe } from '@/lib/server/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = handler(async (req) => {
  const { idToken, captchaToken } = await parseBody(req, z.object({
    idToken: z.string().min(1),
    captchaToken: z.string().optional(),
  }))
  await rateLimit(`firebase-auth:${clientIp(req)}`, 30, 15 * 60_000)
  const identity = await verifyFirebaseIdToken(idToken)
  const provider = identity.firebase?.sign_in_provider
  const isGoogle = provider === 'google.com'
  if (!isGoogle && provider !== 'password') {
    throw new HttpError(401, 'Sign in with Google or email and password to continue.')
  }
  if (!identity.email) {
    throw new HttpError(403, 'This Firebase account does not have an email address.')
  }
  if (isGoogle && identity.email_verified !== true) {
    throw new HttpError(403, 'Your Google account must have a verified email address.')
  }
  if (provider === 'password') await verifyCaptcha(captchaToken, 'login')

  const sql = getSql()
  let row = (await sql`SELECT * FROM users WHERE firebase_uid = ${identity.uid}`)[0]
  const email = identity.email.toLowerCase()
  if (!row) {
    const existing = await findByIdentifier({ email })
    if (existing) {
      if (existing.firebase_uid && existing.firebase_uid !== identity.uid) {
        throw new HttpError(409, 'That email is already linked to another sign-in method.')
      }
      const wipePassword = isGoogle && !existing.email_verified
      if (provider === 'password' && existing.email_verified && !identity.email_verified) {
        await markFirebaseEmailVerified(identity.uid)
      }
      row = (await sql`
        UPDATE users SET firebase_uid = ${identity.uid},
          firebase_google = firebase_google OR ${isGoogle},
          email_verified = email_verified OR ${identity.email_verified},
          password_hash = CASE WHEN ${provider === 'password' || wipePassword} THEN NULL ELSE password_hash END,
          photo_url = COALESCE(photo_url, ${identity.picture ?? null})
        WHERE id = ${existing.id} RETURNING *`)[0]
    } else {
      try {
        row = await createUser({
          name: identity.name || email.split('@')[0],
          email,
          firebaseUid: identity.uid,
          firebaseGoogle: isGoogle,
          emailVerified: identity.email_verified === true,
          photoUrl: identity.picture ?? null,
        })
      } catch (error) {
        if (isUniqueViolation(error)) throw new HttpError(409, 'That email is already registered. Please sign in to the existing account.')
        throw error
      }
    }
  }

  const emailOwner = await findByIdentifier({ email })
  if (emailOwner && emailOwner.id !== row.id) {
    throw new HttpError(409, 'That email is already registered to another account.')
  }
  row = (await sql`
    UPDATE users SET email = ${email},
      email_verified = email_verified OR ${identity.email_verified === true},
      firebase_uid = ${identity.uid},
      firebase_google = firebase_google OR ${isGoogle},
      password_hash = CASE WHEN ${provider === 'password'} THEN NULL ELSE password_hash END,
      photo_url = COALESCE(photo_url, ${identity.picture ?? null})
    WHERE id = ${row.id} RETURNING *`)[0]
  await sql`UPDATE users SET last_login_at = ${Date.now()}::bigint WHERE id = ${row.id}`
  await startSession(row.id)
  return { user: toMe(row) }
})
