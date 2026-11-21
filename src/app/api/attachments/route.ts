import { randomUUID } from 'node:crypto'
import { getSql } from '@/lib/server/db'
import { handler, HttpError } from '@/lib/server/http'
import { rateLimit } from '@/lib/server/ratelimit'
import { requireUser } from '@/lib/server/session'
import { INLINE_IMAGES, MAX_BYTES } from '@/lib/server/uploads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'


export const POST = handler(async (req) => {
  const me = await requireUser()
  await rateLimit(`upload:${me.uid}`, 30, 60_000)
  let form: FormData
  try { form = await req.formData() } catch { throw new HttpError(400, 'Upload failed. Try a smaller file.') }
  const file = form.get('file')
  if (!(file instanceof File)) throw new HttpError(400, 'No file received.')
  if (file.size === 0) throw new HttpError(400, 'That file is empty.')
  if (file.size > MAX_BYTES) throw new HttpError(413, 'Files are limited to 3 MB on the free plan.')

  const mime = file.type || 'application/octet-stream'
  const kind = INLINE_IMAGES.includes(mime) ? 'image' : 'file'
  const name = (file.name || 'file').replace(/[\r\n"\\/]+/g, '_').slice(0, 120)
  const id = randomUUID()
  const data = Buffer.from(await file.arrayBuffer()).toString('base64')
  await getSql()`
    INSERT INTO attachments (id, uploader_id, kind, name, mime, size, data_b64, created_at)
    VALUES (${id}, ${me.uid}, ${kind}, ${name}, ${mime}, ${file.size}, ${data}, ${Date.now()}::bigint)`
  return { attachment: { id, kind, name, size: file.size, mime, url: `/api/attachments/${id}` } }
})
