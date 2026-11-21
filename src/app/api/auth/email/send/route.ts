import { issueCode } from '@/lib/server/codes'
import { handler, HttpError } from '@/lib/server/http'
import { codeEmail, sendMail } from '@/lib/server/mail'
import { rateLimit } from '@/lib/server/ratelimit'
import { requireUser } from '@/lib/server/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = handler(async () => {
  const me = await requireUser({ allowUnverified: true })
  if (!me.email) throw new HttpError(400, 'This account has no email address.')
  if (me.emailVerified) return { ok: true, alreadyVerified: true }
  await rateLimit(`email-send:${me.uid}`, 6, 60 * 60_000)
  const code = await issueCode(me.uid, 'verify_email')
  await sendMail(me.email, `${code} is your Huddle verification code`, codeEmail('Verify your email', code), `verification code: ${code}`)
  return { ok: true }
})
