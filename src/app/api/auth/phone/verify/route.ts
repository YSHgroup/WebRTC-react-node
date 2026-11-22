import { z } from 'zod'
import { getSql, isUniqueViolation } from '@/lib/server/db'
import { verifyFirebaseIdToken } from '@/lib/server/firebase'
import { handler, HttpError, parseBody } from '@/lib/server/http'
import { requireUser } from '@/lib/server/session'
import { toMe } from '@/lib/server/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = handler(async (req) => {
  const me = await requireUser({ allowUnverified: true })
  if (!me.phone) throw new HttpError(400, 'This account has no phone number to verify.')
  const { idToken } = await parseBody(req, z.object({ idToken: z.string().min(1) }))
  const identity = await verifyFirebaseIdToken(idToken)
  if (identity.firebase?.sign_in_provider !== 'phone' || identity.phone_number !== me.phone) {
    throw new HttpError(403, 'The verification code was not for this account’s phone number.')
  }

  try {
    const rows = await getSql()`
      UPDATE users SET phone_verified = true, firebase_uid = COALESCE(firebase_uid, ${identity.uid})
      WHERE id = ${me.uid} AND phone = ${me.phone} RETURNING *`
    if (!rows[0]) throw new HttpError(409, 'This account’s phone number has changed. Sign in again.')
    return { user: toMe(rows[0]) }
  } catch (error) {
    if (isUniqueViolation(error)) throw new HttpError(409, 'This Firebase account is already linked to another user.')
    throw error
  }
})
