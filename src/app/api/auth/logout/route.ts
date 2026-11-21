import { handler } from '@/lib/server/http'
import { endSession } from '@/lib/server/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = handler(async () => {
  endSession()
  return { ok: true }
})
