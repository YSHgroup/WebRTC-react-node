import { getSql } from '@/lib/server/db'
import { handler, HttpError } from '@/lib/server/http'
import { requireUser } from '@/lib/server/session'
import { INLINE_IMAGES } from '@/lib/server/uploads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (_req, { params }) => {
  const me = await requireUser()
  const rows = await getSql()`
    SELECT a.name, a.mime, a.kind, a.data_b64 FROM attachments a WHERE a.id = ${params.id} AND (
      a.uploader_id = ${me.uid} OR EXISTS (
        SELECT 1 FROM messages m JOIN conversation_members cm ON cm.cid = m.cid
        WHERE m.attachment_id = a.id AND cm.uid = ${me.uid}))`
  const a = rows[0]
  if (!a) throw new HttpError(404, 'Attachment not found.')
  const inline = a.kind === 'image' && INLINE_IMAGES.includes(a.mime)
  return new Response(Buffer.from(a.data_b64 as string, 'base64'), {
    headers: {
      'Content-Type': inline ? a.mime : 'application/octet-stream',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(a.name)}`,
      // Uploaded content is never allowed to run scripts, even if someone mislabels a file.
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  })
})
