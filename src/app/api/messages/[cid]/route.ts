import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { mapMessage, memberIds, requireMember } from '@/lib/server/conversations'
import { getSql } from '@/lib/server/db'
import { publish } from '@/lib/server/firebase'
import { handler, HttpError, parseBody } from '@/lib/server/http'
import { rateLimit } from '@/lib/server/ratelimit'
import { requireUser } from '@/lib/server/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * History (default / ?before=<ms>) or catch-up (?after=<ms>). Always ordered oldest → newest.
 * `after` is what clients use to resync after a dropped realtime connection.
 */
export const GET = handler(async (req, { params }) => {
  const me = await requireUser()
  await requireMember(params.cid, me.uid)
  const url = new URL(req.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 40) || 40, 1), 100)
  const before = Number(url.searchParams.get('before')) || null
  const after = Number(url.searchParams.get('after')) || null
  const sql = getSql()

  const rows = after
    ? await sql`
        SELECT m.id, m.cid, m.sender_id, u.display_name AS sender_name, m.text, m.created_at, m.reply_to, m.forwarded_from,
               a.id AS att_id, a.kind AS att_kind, a.name AS att_name, a.size AS att_size, a.mime AS att_mime
        FROM messages m JOIN users u ON u.id = m.sender_id LEFT JOIN attachments a ON a.id = m.attachment_id
        WHERE m.cid = ${params.cid} AND m.created_at > ${after}::bigint
        ORDER BY m.created_at ASC, m.id ASC LIMIT ${limit}`
    : (await sql`
        SELECT m.id, m.cid, m.sender_id, u.display_name AS sender_name, m.text, m.created_at, m.reply_to, m.forwarded_from,
               a.id AS att_id, a.kind AS att_kind, a.name AS att_name, a.size AS att_size, a.mime AS att_mime
        FROM messages m JOIN users u ON u.id = m.sender_id LEFT JOIN attachments a ON a.id = m.attachment_id
        WHERE m.cid = ${params.cid} AND (${before}::bigint IS NULL OR m.created_at < ${before}::bigint)
        ORDER BY m.created_at DESC, m.id DESC LIMIT ${limit}`).reverse()

  return { messages: rows.map(mapMessage) }
})

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const Body = z.object({
  /** Chosen by the browser so a retry after a network error cannot create a duplicate. */
  id: z.string().regex(UUID).optional(),
  text: z.string().max(4000).default(''),
  replyToId: z.string().max(64).optional(),
  forwardedFrom: z.string().trim().max(80).optional(),
  attachmentId: z.string().max(64).optional(),
})

export const POST = handler(async (req, { params }) => {
  const me = await requireUser()
  await requireMember(params.cid, me.uid)
  const body = await parseBody(req, Body)
  if (!body.text.trim() && !body.attachmentId) throw new HttpError(400, 'Write a message or attach a file.')
  await rateLimit(`msg:${me.uid}`, 90, 60_000)
  const sql = getSql()

  // The reply preview is rebuilt on the server so it cannot be forged.
  let replyTo: { id: string; senderName: string; text: string } | null = null
  if (body.replyToId) {
    const r = await sql`
      SELECT m.id, m.text, u.display_name, a.name AS att_name
      FROM messages m JOIN users u ON u.id = m.sender_id LEFT JOIN attachments a ON a.id = m.attachment_id
      WHERE m.id = ${body.replyToId} AND m.cid = ${params.cid}`
    if (r[0]) replyTo = { id: r[0].id, senderName: r[0].display_name, text: String(r[0].text || r[0].att_name || 'Attachment').slice(0, 200) }
  }

  // An attachment may be used by its uploader, or re-used (forwarded) by anyone who can already see it.
  if (body.attachmentId) {
    const ok = await sql`
      SELECT 1 FROM attachments a WHERE a.id = ${body.attachmentId} AND (
        a.uploader_id = ${me.uid} OR EXISTS (
          SELECT 1 FROM messages m JOIN conversation_members cm ON cm.cid = m.cid
          WHERE m.attachment_id = a.id AND cm.uid = ${me.uid}))`
    if (!ok[0]) throw new HttpError(400, 'That attachment is not available.')
  }

  const id = body.id ?? randomUUID()
  const createdAt = Date.now()
  const inserted = await sql`
    INSERT INTO messages (id, cid, sender_id, text, created_at, reply_to, forwarded_from, attachment_id)
    VALUES (${id}, ${params.cid}, ${me.uid}, ${body.text}, ${createdAt}::bigint,
            ${replyTo ? JSON.stringify(replyTo) : null}::jsonb, ${body.forwardedFrom ?? null}, ${body.attachmentId ?? null})
    ON CONFLICT (id) DO NOTHING RETURNING id`

  const load = () => sql`
    SELECT m.id, m.cid, m.sender_id, u.display_name AS sender_name, m.text, m.created_at, m.reply_to, m.forwarded_from,
           a.id AS att_id, a.kind AS att_kind, a.name AS att_name, a.size AS att_size, a.mime AS att_mime
    FROM messages m JOIN users u ON u.id = m.sender_id LEFT JOIN attachments a ON a.id = m.attachment_id
    WHERE m.id = ${id} AND m.cid = ${params.cid} AND m.sender_id = ${me.uid}`

  if (!inserted[0]) {
    // Same id again → this is a retry of a message that already went through. Return it; do not announce it twice.
    const existing = await load()
    if (!existing[0]) throw new HttpError(409, 'Message id is already in use.')
    return { message: mapMessage(existing[0]) }
  }

  const row = (await load())[0]
  const message = mapMessage(row)
  const preview = (body.text.trim() || (row.att_kind === 'image' ? '📷 Photo' : `📎 ${row.att_name ?? 'Attachment'}`)).slice(0, 140)
  await sql`
    UPDATE conversations SET updated_at = ${createdAt}::bigint,
      last_message = ${JSON.stringify({ text: preview, senderId: me.uid, senderName: me.displayName, at: createdAt })}::jsonb
    WHERE id = ${params.cid}`
  await sql`UPDATE conversation_members SET last_read_at = ${createdAt}::bigint WHERE cid = ${params.cid} AND uid = ${me.uid}`

  // Small messages travel whole; big ones travel as a ping and the client fetches them.
  const full = JSON.stringify(message).length < 3000
  await publish(await memberIds(params.cid), { t: 'm', cid: params.cid, id, ...(full ? { msg: message } : {}) })
  return { message }
})
