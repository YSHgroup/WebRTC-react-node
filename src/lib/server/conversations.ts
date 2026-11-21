import { getSql, type Row } from './db'
import { HttpError } from './http'

export const dmId = (a: string, b: string) => [a, b].sort().join('_')

export interface MemberCheck { type: 'dm' | 'group'; role: 'member' | 'admin'; isPublic: boolean }

/** 404 for anyone who is not in the conversation, so ids cannot be probed. */
export async function requireMember(cid: string, uid: string): Promise<MemberCheck> {
  const rows = await getSql()`
    SELECT c.type, c.is_public, m.role
    FROM conversation_members m JOIN conversations c ON c.id = m.cid
    WHERE m.cid = ${cid} AND m.uid = ${uid}`
  if (!rows[0]) throw new HttpError(404, 'Conversation not found.')
  return { type: rows[0].type, role: rows[0].role, isPublic: rows[0].is_public }
}

export async function memberIds(cid: string): Promise<string[]> {
  const rows = await getSql()`SELECT uid FROM conversation_members WHERE cid = ${cid}`
  return rows.map((r) => r.uid as string)
}

export async function listConversations(uid: string) {
  const rows = await getSql()`
    SELECT c.id, c.type, c.name, c.description, c.color, c.icon, c.is_public, c.updated_at, c.last_message,
      (SELECT array_agg(x.uid ORDER BY x.joined_at) FROM conversation_members x WHERE x.cid = c.id) AS members,
      (SELECT array_agg(x.uid) FROM conversation_members x WHERE x.cid = c.id AND x.role = 'admin') AS admins,
      (SELECT count(*) FROM messages g WHERE g.cid = c.id AND g.created_at > me.last_read_at AND g.sender_id <> ${uid})::int AS unread
    FROM conversation_members me JOIN conversations c ON c.id = me.cid
    WHERE me.uid = ${uid}
    ORDER BY c.updated_at DESC`
  return rows.map(mapConversation)
}

export function mapConversation(r: Row) {
  return {
    id: r.id as string,
    type: r.type as 'dm' | 'group',
    name: r.name ?? undefined,
    description: r.description ?? undefined,
    color: r.color ?? undefined,
    icon: r.icon ?? undefined,
    isPublic: !!r.is_public,
    members: (r.members ?? []) as string[],
    admins: (r.admins ?? []) as string[],
    lastMessage: r.last_message ?? undefined,
    updatedAt: Number(r.updated_at),
    unread: Number(r.unread ?? 0),
  }
}

/** Message rows → API shape. Attachments are served from /api/attachments/:id. */
export function mapMessage(r: Row) {
  return {
    id: r.id as string,
    cid: r.cid as string,
    senderId: r.sender_id as string,
    senderName: r.sender_name as string,
    text: r.text as string,
    createdAt: Number(r.created_at),
    ...(r.reply_to ? { replyTo: r.reply_to } : {}),
    ...(r.forwarded_from ? { forwardedFrom: r.forwarded_from as string } : {}),
    ...(r.att_id
      ? { attachment: { id: r.att_id, kind: r.att_kind, name: r.att_name, size: Number(r.att_size), mime: r.att_mime, url: `/api/attachments/${r.att_id}` } }
      : {}),
  }
}
