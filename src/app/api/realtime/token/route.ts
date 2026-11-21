import { handler, HttpError } from '@/lib/server/http'
import { mintRealtimeToken, publicWebConfig, pruneStale, realtimeConfigured } from '@/lib/server/firebase'
import { requireUser } from '@/lib/server/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Exchanges the app's own session for a Firebase custom token that contains only the user id.
 * Also returns the (public) Firebase web config at runtime, so no rebuild is needed when it changes.
 */
export const GET = handler(async () => {
  const me = await requireUser()
  if (!realtimeConfigured()) throw new HttpError(503, 'Realtime is not configured on the server.', 'realtime_unconfigured')
  const token = await mintRealtimeToken(me.uid)
  if (Math.random() < 0.2) await pruneStale(me.uid).catch(() => {})
  return { token, config: publicWebConfig(), uid: me.uid }
})
