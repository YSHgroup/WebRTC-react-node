import { z } from 'zod'
import { consumeCode } from '@/lib/server/codes'
import { getSql } from '@/lib/server/db'
import { clientIp, handler, HttpError, parseBody } from '@/lib/server/http'
import { hashPassword } from '@/lib/server/password'
import { rateLimit } from '@/lib/server/ratelimit'
import { startSession } from '@/lib/server/session'
import { findByIdentifier, toMe } from '@/lib/server/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  email: z.string().trim().email().max(254),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
  password: z.string().min(8, 'Use at least 8 characters for the password.').max(128),
})

export const POST = handler(async (req) => {
  const body = await parseBody(req, Body)
  await rateLimit(`reset-ip:${clientIp(req)}`, 20, 60 * 60_000)
  const row = await findByIdentifier({ email: body.email })
  if (!row) throw new HttpError(400, 'Incorrect code. Try again.')
  await consumeCode(row.id, 'reset_password', body.code)
  // Receiving the code proves the person controls this mailbox, so the address counts as verified.
  const updated = await getSql()`
    UPDATE users SET password_hash = ${await hashPassword(body.password)}, email_verified = true WHERE id = ${row.id} RETURNING *`
  await startSession(row.id)
  return { user: toMe(updated[0]) }
})
