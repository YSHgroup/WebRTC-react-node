import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { verifyRequest } from '@/lib/server/admin'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const user = await verifyRequest(req)
    const result = await sql`
      SELECT uid, display_name AS "displayName", email, phone, photo_url AS "photoURL",
             bio, online, joined_defaults AS "joinedDefaults", last_seen AS "lastSeen", created_at AS "createdAt"
      FROM users WHERE uid = ${user.uid}
    `
    return NextResponse.json({ profile: result.rows[0] ?? null })
  } catch {
    return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await verifyRequest(req)
    const patch = await req.json() as {
      displayName?: string
      phone?: string | null
      bio?: string
      photoURL?: string | null
    }
    const displayName = patch.displayName?.trim()
    const bio = patch.bio?.slice(0, 200)
    await sql`
      UPDATE users SET
        display_name = COALESCE(${displayName ?? null}, display_name),
        phone = COALESCE(${patch.phone === undefined ? null : patch.phone}, phone),
        bio = COALESCE(${bio ?? null}, bio),
        photo_url = COALESCE(${patch.photoURL === undefined ? null : patch.photoURL}, photo_url)
      WHERE uid = ${user.uid}
    `
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Could not update profile.' }, { status: 400 })
  }
}
