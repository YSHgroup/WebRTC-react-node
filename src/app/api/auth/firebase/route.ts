import { z } from 'zod'
import { getSql, isUniqueViolation } from '@/lib/server/db'
import { verifyFirebaseIdToken } from '@/lib/server/firebase'
import { handler, HttpError, parseBody } from '@/lib/server/http'
import { startSession } from '@/lib/server/session'
import { createUser, findByIdentifier, toMe } from '@/lib/server/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = handler(async (req) => {
  const { idToken } = await parseBody(req, z.object({ idToken: z.string().min(1) }))
  const identity = await verifyFirebaseIdToken(idToken)
  if (identity.firebase?.sign_in_provider !== 'google.com') {
    throw new HttpError(401, 'Sign in with a Google account to continue.')
  }
  if (!identity.email || identity.email_verified !== true) {
    throw new HttpError(403, 'Your Google account must have a verified email address.')
  }

  const sql = getSql()
  let row = (await sql`SELECT * FROM users WHERE firebase_uid = ${identity.uid}`)[0]
  const email = identity.email.toLowerCase()
  if (!row) {
    const existing = await findByIdentifier({ email })
    if (existing) {
      if (existing.firebase_uid && existing.firebase_uid !== identity.uid) {
        throw new HttpError(409, 'That email is already linked to another sign-in method.')
      }
      const wipePassword = !existing.email_verified
      row = (await sql`
        UPDATE users SET firebase_uid = ${identity.uid}, firebase_google = true, email_verified = true,
          password_hash = CASE WHEN ${wipePassword} THEN NULL ELSE password_hash END,
          photo_url = COALESCE(photo_url, ${identity.picture ?? null})
        WHERE id = ${existing.id} RETURNING *`)[0]
    } else {
      try {
        row = await createUser({
          name: identity.name || email.split('@')[0],
          email,
          firebaseUid: identity.uid,
          firebaseGoogle: true,
          emailVerified: true,
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
    UPDATE users SET email = ${email}, email_verified = true, firebase_uid = ${identity.uid},
      firebase_google = true, photo_url = COALESCE(photo_url, ${identity.picture ?? null})
    WHERE id = ${row.id} RETURNING *`)[0]
  await sql`UPDATE users SET last_login_at = ${Date.now()}::bigint WHERE id = ${row.id}`
  await startSession(row.id)
  return { user: toMe(row) }
})
