import { z } from 'zod'
import { syncVerifiedFirebaseEmail } from '@/lib/server/firebase'
import { clientIp, handler, parseBody } from '@/lib/server/http'
import { rateLimit } from '@/lib/server/ratelimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = handler(async (req) => {
  const { uid } = await parseBody(req, z.object({ uid: z.string().min(1).max(128) }))
  await rateLimit(`email-link-confirm:${clientIp(req)}`, 30, 60 * 60_000)
  await syncVerifiedFirebaseEmail(uid)
  return { ok: true }
})
