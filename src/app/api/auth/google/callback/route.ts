import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSql } from '@/lib/server/db'
import { exchangeCode, readOauthCookie } from '@/lib/server/google'
import { startSession } from '@/lib/server/session'
import { createUser, findByIdentifier } from '@/lib/server/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const fail = (req: Request, reason: string) => {
  const res = NextResponse.redirect(new URL(`/login?error=${reason}`, req.url))
  res.cookies.set('huddle_oauth', '', { path: '/api/auth/google', maxAge: 0 })
  return res
}

/** Step 2: Google sends the person back here with a one-time code. */
export async function GET(req: Request) {
  const url = new URL(req.url)
  if (url.searchParams.get('error')) return fail(req, 'google_cancelled')
  const code = url.searchParams.get('code')
  const saved = await readOauthCookie(cookies().get('huddle_oauth')?.value)
  if (!code || !saved || saved.state !== url.searchParams.get('state')) return fail(req, 'google_state')

  try {
    const g = await exchangeCode(req, code, saved.verifier)
    const sql = getSql()
    let row = (await sql`SELECT * FROM users WHERE google_sub = ${g.sub}`)[0]

    if (!row && g.emailVerified) {
      const existing = await findByIdentifier({ email: g.email })
      if (existing) {
        // Link Google to the existing account. If that account's email was never verified, someone else may have
        // registered this address first, so their password is discarded (prevents account pre-hijacking).
        const wipe = !existing.email_verified
        row = (await sql`
          UPDATE users SET google_sub = ${g.sub}, email_verified = true,
            password_hash = CASE WHEN ${wipe} THEN NULL ELSE password_hash END,
            photo_url = COALESCE(photo_url, ${g.picture})
          WHERE id = ${existing.id} RETURNING *`)[0]
      }
    }
    if (!row) {
      if (!g.emailVerified) return fail(req, 'google_unverified')
      row = await createUser({ name: g.name, email: g.email, googleSub: g.sub, emailVerified: true, photoUrl: g.picture })
    }

    await sql`UPDATE users SET last_login_at = ${Date.now()}::bigint WHERE id = ${row.id}`
    await startSession(row.id)
    const res = NextResponse.redirect(new URL('/chat', req.url))
    res.cookies.set('huddle_oauth', '', { path: '/api/auth/google', maxAge: 0 })
    return res
  } catch (error) {
    console.error('[google-oauth]', error)
    return fail(req, 'google_failed')
  }
}
