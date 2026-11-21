import { jwtVerify } from 'jose'
import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/session-constants'

/**
 * Convenience redirects only (signed-out → /login, signed-in → skip /login). It is NOT the security boundary:
 * every API route re-checks the session itself, so a middleware bypass exposes no data.
 */
export async function middleware(req: NextRequest) {
  const secret = process.env.AUTH_SECRET
  const token = req.cookies.get(SESSION_COOKIE)?.value
  let signedIn = false
  if (secret && token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ['HS256'] })
      signedIn = true
    } catch { /* expired or forged */ }
  }
  const { pathname } = req.nextUrl
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot'
  if (!signedIn && !isAuthPage) return NextResponse.redirect(new URL('/login', req.url))
  if (signedIn && isAuthPage && !req.nextUrl.searchParams.has('verify')) return NextResponse.redirect(new URL('/chat', req.url))
  return NextResponse.next()
}

export const config = {
  matcher: ['/chat/:path*', '/contacts/:path*', '/profile/:path*', '/call/:path*', '/login', '/register', '/forgot'],
}
