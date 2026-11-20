import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { verifyRequest } from '@/lib/server/admin'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const user = await verifyRequest(req)
    const result = await sql`
      SELECT id, type, name, description, color, icon, is_public AS "isPublic",
             members, admins, last_message AS "lastMessage", updated_at AS "updatedAt"
      FROM conversations
      WHERE ${user.uid} = ANY(members)
      ORDER BY updated_at DESC
    `
    return NextResponse.json({ conversations: result.rows })
  } catch {
    return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await verifyRequest(req)
    const body = await req.json() as {
      type: 'dm' | 'group'
      members?: string[]
      name?: string
      description?: string
    }
    if (body.type === 'dm') {
      if (!body.members?.length) return NextResponse.json({ error: 'Choose a person.' }, { status: 400 })
      const other = body.members[0]
      const id = [user.uid, other].sort().join('_')
      const dmMembers = `{${[user.uid, other].join(',')}}`
      await sql`
        INSERT INTO conversations (id, type, members, admins, updated_at)
        VALUES (${id}, 'dm', ${dmMembers}::TEXT[], '{}'::TEXT[], ${Date.now()})
        ON CONFLICT (id) DO UPDATE SET updated_at = EXCLUDED.updated_at
      `
      return NextResponse.json({ id })
    }
    if (!body.name?.trim()) return NextResponse.json({ error: 'Enter a group name.' }, { status: 400 })
    const id = crypto.randomUUID()
    const members = Array.from(new Set([user.uid, ...(body.members ?? [])]))
    const memberArray = `{${members.join(',')}}`
    const adminArray = `{${user.uid}}`
    await sql`
      INSERT INTO conversations (id, type, name, description, color, icon, is_public, members, admins, updated_at)
      VALUES (${id}, 'group', ${body.name.trim()}, ${body.description?.trim() ?? ''}, '#7C5CFF', 'users', false,
              ${memberArray}::TEXT[], ${adminArray}::TEXT[], ${Date.now()})
    `
    return NextResponse.json({ id })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Could not create conversation.' }, { status: 400 })
  }
}
