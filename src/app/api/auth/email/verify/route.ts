import { z } from 'zod'
import { consumeCode } from '@/lib/server/codes'
import { getSql } from '@/lib/server/db'
import { handler, parseBody } from '@/lib/server/http'
import { requireUser } from '@/lib/server/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = handler(async (req) => {
  const me = await requireUser({ allowUnverified: true })
  const { code } = await parseBody(req, z.object({ code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.') }))
  await consumeCode(me.uid, 'verify_email', code)
  await getSql()`UPDATE users SET email_verified = true WHERE id = ${me.uid}`
  return { ok: true }
})
