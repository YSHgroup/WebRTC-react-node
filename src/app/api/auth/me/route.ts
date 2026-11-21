import { handler } from '@/lib/server/http'
import { readSessionUid, requireUser } from '@/lib/server/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Returns { user: null } (200) when signed out, so the app can tell "signed out" from "server broken". */
export const GET = handler(async () => {
  if (!(await readSessionUid())) return { user: null }
  try {
    return { user: await requireUser({ allowUnverified: true }) }
  } catch (error) {
    if ((error as { status?: number }).status === 401) return { user: null }
    throw error
  }
})
