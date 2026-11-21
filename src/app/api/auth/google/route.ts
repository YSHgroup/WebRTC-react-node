import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { googleConfigured, googleRedirectUri, newPkce, signOauthCookie } from '@/lib/server/google'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Step 1 of "Continue with Google": redirects the browser to Google's consent screen (authorization code + PKCE). */
export async function GET(req: Request) {
  if (!googleConfigured() || !process.env.AUTH_SECRET) {
    return NextResponse.redirect(new URL('/login?error=google_not_configured', req.url))
  }
  const { verifier, challenge, state } = newPkce()
  cookies().set('huddle_oauth', await signOauthCookie({ state, verifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/google',
    maxAge: 600,
  })
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(req),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString()
  return NextResponse.redirect(url)
}
