import { getSql } from '@/lib/server/db'
import { handler } from '@/lib/server/http'
import { requireUser } from '@/lib/server/session'
import { toPublic } from '@/lib/server/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async () => {
  await requireUser()
  const rows = await getSql()`SELECT * FROM users ORDER BY display_name LIMIT 1000`
  return { users: rows.map(toPublic) }
})
