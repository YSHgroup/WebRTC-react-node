import { getSql } from '@/lib/server/db'
import { listConversations } from '@/lib/server/conversations'
import { handler } from '@/lib/server/http'
import { requireUser } from '@/lib/server/session'
import { toPublic } from '@/lib/server/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Everything the workspace needs on first paint, in one round trip (one cold start instead of three). */
export const GET = handler(async () => {
  const me = await requireUser()
  const [users, conversations] = await Promise.all([
    getSql()`SELECT * FROM users ORDER BY display_name LIMIT 1000`,
    listConversations(me.uid),
  ])
  return { me, users: users.map(toPublic), conversations }
})
