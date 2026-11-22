import { z } from 'zod'
import { consumeEmailLinkToken } from '@/lib/server/codes'
import { getSql } from '@/lib/server/db'
import { handler, parseBody } from '@/lib/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = handler(async (req) => {
  const { uid, token } = await parseBody(req, z.object({
    uid: z.string().uuid(),
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'This verification link is invalid.'),
  }))
  await consumeEmailLinkToken(uid, token)
  await getSql()`UPDATE users SET email_verified = true WHERE id = ${uid} AND email IS NOT NULL`
  return { ok: true }
})
