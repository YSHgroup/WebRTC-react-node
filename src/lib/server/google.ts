import { createHash, randomBytes } from 'node:crypto'
import { SignJWT, createRemoteJWKSet, jwtVerify } from 'jose'

const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))

export const googleConfigured = () => !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET

export const appOrigin = (req: Request) => process.env.APP_URL?.replace(/\/$/, '') || new URL(req.url).origin
export const googleRedirectUri = (req: Request) => `${appOrigin(req)}/api/auth/google/callback`

const b64url = (buf: Buffer) => buf.toString('base64url')

export function newPkce() {
  const verifier = b64url(randomBytes(32))
  const challenge = b64url(createHash('sha256').update(verifier).digest())
  return { verifier, challenge, state: b64url(randomBytes(16)) }
}

const key = () => new TextEncoder().encode(process.env.AUTH_SECRET ?? '')

/** Short-lived signed cookie that carries the PKCE verifier and state across the redirect to Google. */
export const signOauthCookie = (data: { state: string; verifier: string }) =>
  new SignJWT(data).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('10m').sign(key())

export async function readOauthCookie(token: string | undefined) {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] })
    return payload as unknown as { state: string; verifier: string }
  } catch {
    return null
  }
}

export interface GoogleProfile { sub: string; email: string; emailVerified: boolean; name: string; picture: string | null }

export async function exchangeCode(req: Request, code: string, verifier: string): Promise<GoogleProfile> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(req),
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  })
  const data = (await res.json()) as { id_token?: string; error?: string; error_description?: string }
  if (!res.ok || !data.id_token) throw new Error(`Google token exchange failed: ${data.error_description ?? data.error ?? res.status}`)
  const { payload } = await jwtVerify(data.id_token, JWKS, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: process.env.GOOGLE_CLIENT_ID!,
  })
  if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') throw new Error('Google did not return an email address.')
  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === 'string' && payload.name ? payload.name : payload.email.split('@')[0],
    picture: typeof payload.picture === 'string' ? payload.picture : null,
  }
}
