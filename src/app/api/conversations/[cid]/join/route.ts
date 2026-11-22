import { memberIds, requireMember } from '@/lib/server/conversations'
import { getSql } from '@/lib/server/db'
import { publish } from '@/lib/server/firebase'
import { handler, HttpError } from '@/lib/server/http'
import { requireUser } from '@/lib/server/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = handler(async (_req, { params }) => {
  const me = await requireUser()
  const sql = getSql()
  const group = await sql`SELECT id, type, is_public FROM conversations WHERE id = ${params.cid}`
  if (!group[0] || group[0].type !== 'group') throw new HttpError(404, 'Group not found.')
  if (!group[0].is_public) throw new HttpError(403, 'This is a private group.')

  try {
    await requireMember(params.cid, me.uid)
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 404) throw error
    await sql`
      INSERT INTO conversation_members (cid, uid, role, joined_at, last_read_at)
      VALUES (${params.cid}, ${me.uid}, 'member', ${Date.now()}::bigint, ${Date.now()}::bigint)
      ON CONFLICT DO NOTHING`
  }

  await publish(await memberIds(params.cid), { t: 'conv', cid: params.cid })
  return { ok: true }
})
