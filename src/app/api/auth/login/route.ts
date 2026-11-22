import { z } from 'zod'
import { verifyCaptcha } from '@/lib/server/captcha'
import { getSql } from '@/lib/server/db'
import { clientIp, handler, HttpError, parseBody } from '@/lib/server/http'
import { parseIdentifier } from '@/lib/server/identifier'
import { verifyPassword } from '@/lib/server/password'
import { rateLimit } from '@/lib/server/ratelimit'
import { startSession } from '@/lib/server/session'
import { findByIdentifier, toMe } from '@/lib/server/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  identifier: z.string().trim().min(3).max(254),
  country: z.string().length(2).optional(),
  password: z.string().min(1).max(128),
  captchaToken: z.string().optional(),
})

export const POST = handler(async (req) => {
  const body = await parseBody(req, Body)
  const ip = clientIp(req)
  await rateLimit(`login-ip:${ip}`, 30, 15 * 60_000)
  const id = parseIdentifier(body.identifier, body.country)
  if ('email' in id) await verifyCaptcha(body.captchaToken, 'login')
  await rateLimit(`login-id:${'email' in id ? id.email : id.phone}`, 8, 15 * 60_000)

  const row = await findByIdentifier(id)
  const ok = await verifyPassword(body.password, row?.password_hash ?? null)
  if (!row || !ok) throw new HttpError(401, 'Email/phone or password is incorrect.')

  await getSql()`UPDATE users SET last_login_at = ${Date.now()}::bigint WHERE id = ${row.id}`
  await startSession(row.id)
  return { user: toMe(row) }
})
