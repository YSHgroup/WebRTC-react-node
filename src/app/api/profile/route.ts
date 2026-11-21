import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { z } from 'zod'
import { getSql, isUniqueViolation } from '@/lib/server/db'
import { handler, HttpError, parseBody } from '@/lib/server/http'
import { requireUser } from '@/lib/server/session'
import { toMe } from '@/lib/server/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  displayName: z.string().trim().min(2, 'Enter your name.').max(80).optional(),
  bio: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  /** Square JPEG data URL produced in the browser (256 px). Pass null to remove. */
  photoDataUrl: z.string().max(200_000).nullable().optional(),
})

export const GET = handler(async () => ({ user: await requireUser() }))

export const PATCH = handler(async (req) => {
  const me = await requireUser()
  const body = await parseBody(req, Body)
  const sql = getSql()

  let phone: string | null | undefined
  if (body.phone === null || body.phone === '') phone = null
  else if (body.phone !== undefined) {
    const p = parsePhoneNumberFromString(body.phone, 'US')
    if (!p || !p.isValid()) throw new HttpError(400, 'Enter a valid phone number, including the country code (for example +44…).')
    phone = p.number
  }
  if (phone === null && !me.email) throw new HttpError(400, 'Keep a phone number or an email so you can still sign in.')

  let photo: string | null | undefined
  if (body.photoDataUrl === null) photo = null
  else if (body.photoDataUrl !== undefined) {
    const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(body.photoDataUrl)
    if (!m) throw new HttpError(400, 'Use a JPEG image for your photo.')
    photo = m[1]
  }

  try {
    const rows = await sql`
      UPDATE users SET
        display_name = COALESCE(${body.displayName ?? null}, display_name),
        bio = COALESCE(${body.bio ?? null}, bio),
        phone = CASE WHEN ${phone !== undefined} THEN ${phone ?? null} ELSE phone END,
        phone_verified = CASE WHEN ${phone !== undefined} THEN false ELSE phone_verified END,
        photo_data = CASE WHEN ${photo !== undefined} THEN ${photo ?? null} ELSE photo_data END,
        photo_version = CASE WHEN ${photo !== undefined} THEN photo_version + 1 ELSE photo_version END
      WHERE id = ${me.uid} RETURNING *`
    return { user: toMe(rows[0]) }
  } catch (error) {
    if (isUniqueViolation(error)) throw new HttpError(409, 'That phone number is already used by another account.')
    throw error
  }
})
