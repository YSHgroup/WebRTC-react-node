import { z } from 'zod'
import { dmId, listConversations, memberIds } from '@/lib/server/conversations'
import { getSql } from '@/lib/server/db'
import { handler, HttpError, parseBody } from '@/lib/server/http'
import { publish } from '@/lib/server/firebase'
import { requireUser } from '@/lib/server/session'
import { randomUUID } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async () => {
  const me = await requireUser()
  return { conversations: await listConversations(me.uid) }
})

const Body = z.discriminatedUnion('type', [
  z.object({ type: z.literal('dm'), userId: z.string().min(1) }),
  z.object({
    type: z.literal('group'),
    name: z.string().trim().min(2, 'Enter a group name.').max(80),
    description: z.string().trim().max(200).optional(),
    memberIds: z.array(z.string()).max(200).optional(),
  }),
])

export const POST = handler(async (req) => {
  const me = await requireUser()
  const body = await parseBody(req, Body)
  const sql = getSql()
  const now = Date.now()

  if (body.type === 'dm') {
    if (body.userId === me.uid) throw new HttpError(400, 'You cannot message yourself.')
    const other = await sql`SELECT id FROM users WHERE id = ${body.userId}`
    if (!other[0]) throw new HttpError(404, 'That person does not exist.')
    const id = dmId(me.uid, body.userId)
    await sql`INSERT INTO conversations (id, type, created_by, created_at, updated_at) VALUES (${id}, 'dm', ${me.uid}, ${now}::bigint, ${now}::bigint) ON CONFLICT (id) DO NOTHING`
    await sql`
      INSERT INTO conversation_members (cid, uid, role, joined_at, last_read_at)
      VALUES (${id}, ${me.uid}, 'member', ${now}::bigint, ${now}::bigint), (${id}, ${body.userId}, 'member', ${now}::bigint, ${now}::bigint)
      ON CONFLICT DO NOTHING`
    await publish(await memberIds(id), { t: 'conv', cid: id })
    return { id }
  }

  const ids = Array.from(new Set(body.memberIds ?? [])).filter((u) => u !== me.uid)
  const valid = ids.length ? await sql`SELECT id FROM users WHERE id = ANY(${ids})` : []
  const members = valid.map((r) => r.id as string)
  const id = randomUUID()
  await sql`
    INSERT INTO conversations (id, type, name, description, color, icon, is_public, created_by, created_at, updated_at)
    VALUES (${id}, 'group', ${body.name}, ${body.description ?? ''}, '#7C5CFF', 'users', false, ${me.uid}, ${now}::bigint, ${now}::bigint)`
  await sql`
    INSERT INTO conversation_members (cid, uid, role, joined_at, last_read_at)
    SELECT ${id}, u, CASE WHEN u = ${me.uid} THEN 'admin' ELSE 'member' END, ${now}::bigint, ${now}::bigint
    FROM unnest(${[me.uid, ...members]}::text[]) AS u`
  await publish(await memberIds(id), { t: 'conv', cid: id })
  return { id }
})
