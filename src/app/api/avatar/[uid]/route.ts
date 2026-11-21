import { getSql } from '@/lib/server/db'
import { handler, HttpError } from '@/lib/server/http'
import { requireUser } from '@/lib/server/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Avatars are served as images (not inlined in every user record) and cached by version. */
export const GET = handler(async (_req, { params }) => {
  await requireUser()
  const rows = await getSql()`SELECT photo_data FROM users WHERE id = ${params.uid} AND photo_data IS NOT NULL`
  if (!rows[0]) throw new HttpError(404, 'No avatar.')
  return new Response(Buffer.from(rows[0].photo_data as string, 'base64'), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  })
})
