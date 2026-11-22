import { z } from 'zod'
import { memberIds, requireMember } from '@/lib/server/conversations'
import { getSql } from '@/lib/server/db'
import { publish } from '@/lib/server/firebase'
import { handler, HttpError, parseBody } from '@/lib/server/http'
import { requireUser } from '@/lib/server/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Admins add people to a group. */
export const POST = handler(async (req, { params }) => {
  const me = await requireUser()
  const access = await requireMember(params.cid, me.uid)
  if (access.type !== 'group') throw new HttpError(400, 'Only groups have members to add.')
  if (access.role !== 'admin') throw new HttpError(403, 'Only group admins can add people.')
  const { userIds } = await parseBody(req, z.object({ userIds: z.array(z.string()).min(1).max(200) }))
  const sql = getSql()
  const now = Date.now()
  await sql`
    INSERT INTO conversation_members (cid, uid, role, joined_at, last_read_at)
    SELECT ${params.cid}, u.id, 'member', ${now}::bigint, ${now}::bigint FROM users u WHERE u.id = ANY(${userIds})
    ON CONFLICT DO NOTHING`
  await publish(await memberIds(params.cid), { t: 'conv', cid: params.cid })
  return { ok: true }
})

/** Leave the group. If you were the only admin, the longest-standing member takes over. */
export const DELETE = handler(async (_req, { params }) => {
  const me = await requireUser()
  const access = await requireMember(params.cid, me.uid)
  if (access.type !== 'group') throw new HttpError(400, 'You cannot leave a direct message.')
  const sql = getSql()
  await sql`DELETE FROM conversation_members WHERE cid = ${params.cid} AND uid = ${me.uid}`
  const remaining = await sql`SELECT uid, role FROM conversation_members WHERE cid = ${params.cid} ORDER BY joined_at`
  if (remaining.length && !remaining.some((r) => r.role === 'admin')) {
    await sql`UPDATE conversation_members SET role = 'admin' WHERE cid = ${params.cid} AND uid = ${remaining[0].uid}`
  }
  await publish([me.uid, ...remaining.map((r) => r.uid as string)], { t: 'conv', cid: params.cid })
  return { ok: true }
})
