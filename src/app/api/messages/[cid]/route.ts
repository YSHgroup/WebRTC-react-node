import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { verifyRequest } from '@/lib/server/admin'

export const runtime = 'nodejs'

export async function GET(req: Request, { params }: { params: { cid: string } }) {
  try {
    const user = await verifyRequest(req)
    const conversation = await sql`
      SELECT members FROM conversations WHERE id = ${params.cid}
    `
    if (!conversation.rows[0]?.members?.includes(user.uid)) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }
    const url = new URL(req.url)
    const count = Math.min(Number(url.searchParams.get('count') ?? '50'), 100)
    const before = url.searchParams.get('before')
    const result = before
      ? await sql`SELECT * FROM messages WHERE cid = ${params.cid} AND created_at < ${Number(before)}
                  ORDER BY created_at DESC LIMIT ${count}`
      : await sql`SELECT * FROM messages WHERE cid = ${params.cid}
                  ORDER BY created_at DESC LIMIT ${count}`
    return NextResponse.json({ messages: result.rows.reverse() })
  } catch {
    return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  }
}

export async function POST(req: Request, { params }: { params: { cid: string } }) {
  try {
    const user = await verifyRequest(req)
    const conversation = await sql`SELECT members FROM conversations WHERE id = ${params.cid}`
    if (!conversation.rows[0]?.members?.includes(user.uid)) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }
    const draft = await req.json() as {
      senderName: string
      text: string
      replyTo?: unknown
      forwardedFrom?: string
      attachment?: unknown
    }
    const id = crypto.randomUUID()
    const createdAt = Date.now()
    await sql`
      INSERT INTO messages (id, cid, sender_id, sender_name, text, created_at, reply_to, forwarded_from, attachment)
      VALUES (${id}, ${params.cid}, ${user.uid}, ${draft.senderName}, ${draft.text ?? ''}, ${createdAt},
              ${draft.replyTo ? JSON.stringify(draft.replyTo) : null},
              ${draft.forwardedFrom ?? null},
              ${draft.attachment ? JSON.stringify(draft.attachment) : null})
    `
    const preview = (draft.text.trim() || (draft.attachment ? 'Attachment' : '')).slice(0, 140)
    await sql`
      UPDATE conversations
      SET last_message = ${JSON.stringify({ text: preview, senderId: user.uid, senderName: draft.senderName, at: createdAt })},
          updated_at = ${createdAt}
      WHERE id = ${params.cid}
    `
    return NextResponse.json({
      message: {
        id, cid: params.cid, senderId: user.uid, senderName: draft.senderName,
        text: draft.text, createdAt, replyTo: draft.replyTo, forwardedFrom: draft.forwardedFrom,
        attachment: draft.attachment,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Could not send message.' }, { status: 400 })
  }
}
