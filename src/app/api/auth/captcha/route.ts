import { handler } from '@/lib/server/http'

export const dynamic = 'force-dynamic'

export const GET = handler(async () => ({
  siteKey: process.env.RECAPTCHA_SITE_KEY || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '',
}))
