import { z } from 'zod'
import { issueCode } from '@/lib/server/codes'
import { clientIp, handler, parseBody } from '@/lib/server/http'
import { codeEmail, sendMail } from '@/lib/server/mail'
import { rateLimit } from '@/lib/server/ratelimit'
import { findByIdentifier } from '@/lib/server/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Always answers the same way, so the form cannot be used to discover which emails have accounts. */
export const POST = handler(async (req) => {
  const { email } = await parseBody(req, z.object({ email: z.string().trim().email().max(254) }))
  await rateLimit(`forgot-ip:${clientIp(req)}`, 10, 60 * 60_000)
  await rateLimit(`forgot:${email.toLowerCase()}`, 4, 60 * 60_000)
  const row = await findByIdentifier({ email })
  if (row) {
    try {
      const code = await issueCode(row.id, 'reset_password')
      await sendMail(email, `${code} is your Huddle password reset code`, codeEmail('Reset your password', code), `reset code: ${code}`)
    } catch (error) {
      console.error('[forgot-password]', error)
    }
  }
  return { ok: true }
})
