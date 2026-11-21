import { z } from 'zod'
import { verifyCaptcha } from '@/lib/server/captcha'
import { codeEmail, sendMail } from '@/lib/server/mail'
import { issueCode } from '@/lib/server/codes'
import { isUniqueViolation } from '@/lib/server/db'
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
  password: z.string().min(8, 'Use at least 8 characters for the password.').max(128),
  captchaToken: z.string().optional(),
})

export const POST = handler(async (req) => {
  const body = await parseBody(req, Body)
  await rateLimit(`register:${clientIp(req)}`, 10, 60 * 60_000)
  await verifyCaptcha(body.captchaToken, 'register')
  const id = parseIdentifier(body.identifier, body.country)

  let row
  try {
    row = await createUser({
      name: body.name,
      email: 'email' in id ? id.email : null,
      phone: 'phone' in id ? id.phone : null,
      passwordHash: await hashPassword(body.password),
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new HttpError(409, 'email' in id ? 'An account with this email already exists. Try signing in.' : 'An account with this phone number already exists. Try signing in.')
    }
    throw error
  }

  await startSession(row.id)
  const me = toMe(row)
  if (me.needsVerification && me.email) {
    try {
      const code = await issueCode(me.uid, 'verify_email')
      await sendMail(me.email, `${code} is your Huddle verification code`, codeEmail('Verify your email', code), `verification code: ${code}`)
    } catch (error) {
      // The account exists; the person can ask for another code from the verification screen.
      console.error('[register] could not send verification email', error)
    }
  }
  return { user: me }
})
