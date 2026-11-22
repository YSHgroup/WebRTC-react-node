import { getSql } from '@/lib/server/db'
import { firebaseAuthConfigured, realtimeConfigured } from '@/lib/server/firebase'
import { handler } from '@/lib/server/http'
import { emailVerificationRequired } from '@/lib/server/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Open /api/health after deploying. It shows which settings the server can see (true/false only — never values)
 * and whether the database answers. This is the first place to look when something "does not work on Vercel".
 */
export const GET = handler(async () => {
  let database: 'ok' | 'not-configured' | 'schema-missing' | 'error' = 'not-configured'
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    try {
      await getSql()`SELECT 1 FROM users LIMIT 1`
      database = 'ok'
    } catch (error) {
      database = /relation .* does not exist/i.test(String((error as Error).message)) ? 'schema-missing' : 'error'
    }
  }
  return {
    ok: database === 'ok' && (process.env.AUTH_SECRET?.length ?? 0) >= 32,
    database,
    authSecret: (process.env.AUTH_SECRET?.length ?? 0) >= 32,
    realtime: realtimeConfigured(),
    google: firebaseAuthConfigured(),
    firebaseAuth: firebaseAuthConfigured(),
    emailDelivery: !!process.env.RESEND_API_KEY,
    emailVerificationRequired: emailVerificationRequired(),
    phoneVerificationRequired: true,
    captcha: !!process.env.RECAPTCHA_SECRET_KEY,
    captchaSiteKey: !!(process.env.RECAPTCHA_SITE_KEY || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
    turn: !!(process.env.TURN_URLS || process.env.CLOUDFLARE_TURN_KEY_ID),
  }
})
