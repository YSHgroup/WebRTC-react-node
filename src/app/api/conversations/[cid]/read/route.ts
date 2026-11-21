import { requireMember } from '@/lib/server/conversations'
import { getSql } from '@/lib/server/db'
import { handler } from '@/lib/server/http'
import { requireUser } from '@/lib/server/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = handler(async (_req, { params }) => {
  const me = await requireUser()
  await requireMember(params.cid, me.uid)
  await getSql()`UPDATE conversation_members SET last_read_at = ${Date.now()}::bigint WHERE cid = ${params.cid} AND uid = ${me.uid}`
  return { ok: true }
})
