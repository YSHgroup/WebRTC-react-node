import { z } from 'zod'
import { handler, HttpError, parseBody } from '@/lib/server/http'
import { sendEmailVerification } from '@/lib/server/email-verification'
import { rateLimit } from '@/lib/server/ratelimit'
import { requireUser } from '@/lib/server/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = handler(async (req) => {
  const { method } = await parseBody(req, z.object({ method: z.enum(['code', 'link']) }))
  const me = await requireUser({ allowUnverified: true })
  if (!me.email) throw new HttpError(400, 'This account has no email address.')
  if (me.emailVerified) return { ok: true, alreadyVerified: true }
  await rateLimit(`email-send:${me.uid}`, 6, 60 * 60_000)
  await sendEmailVerification(me.uid, me.email, method)
  return { ok: true }
})
