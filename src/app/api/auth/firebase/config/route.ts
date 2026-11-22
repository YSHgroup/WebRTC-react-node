import { firebaseAuthConfigured, publicWebConfig } from '@/lib/server/firebase'
import { handler, HttpError } from '@/lib/server/http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const GET = handler(async () => {
  if (!firebaseAuthConfigured()) throw new HttpError(503, 'Firebase Authentication is not configured on the server.', 'firebase_auth_unconfigured')
  return publicWebConfig()
})
