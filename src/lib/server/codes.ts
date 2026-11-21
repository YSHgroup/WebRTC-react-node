import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import { getSql } from './db'
import { HttpError } from './http'

export type CodePurpose = 'verify_email' | 'reset_password'

const TTL = 10 * 60_000
const COOLDOWN = 30_000
const MAX_ATTEMPTS = 5

const hashCode = (uid: string, purpose: string, code: string) =>
  createHmac('sha256', process.env.AUTH_SECRET ?? '').update(`${uid}:${purpose}:${code}`).digest('hex')

/** Creates a fresh 6-digit code (replacing any older one). Throws 429 if one was sent under 30 seconds ago. */
export async function issueCode(uid: string, purpose: CodePurpose): Promise<string> {
  const sql = getSql()
  const now = Date.now()
  const recent = await sql`SELECT created_at FROM auth_codes WHERE uid = ${uid} AND purpose = ${purpose} ORDER BY created_at DESC LIMIT 1`
  if (recent[0] && now - Number(recent[0].created_at) < COOLDOWN) {
    throw new HttpError(429, 'Please wait 30 seconds before asking for another code.')
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  await sql`DELETE FROM auth_codes WHERE uid = ${uid} AND purpose = ${purpose}`
  await sql`
    INSERT INTO auth_codes (id, uid, purpose, code_hash, expires_at, created_at)
    VALUES (${randomUUID()}, ${uid}, ${purpose}, ${hashCode(uid, purpose, code)}, ${now + TTL}::bigint, ${now}::bigint)`
  return code
}

/** Checks and consumes a code. Throws a readable 400 on any failure. */
export async function consumeCode(uid: string, purpose: CodePurpose, code: string) {
  const sql = getSql()
  const rows = await sql`SELECT * FROM auth_codes WHERE uid = ${uid} AND purpose = ${purpose} ORDER BY created_at DESC LIMIT 1`
  const row = rows[0]
  if (!row) throw new HttpError(400, 'Request a new code first.')
  if (Date.now() > Number(row.expires_at)) throw new HttpError(400, 'That code expired. Request a new one.')
  if (row.attempts >= MAX_ATTEMPTS) throw new HttpError(429, 'Too many wrong attempts. Request a new code.')
  const given = Buffer.from(hashCode(uid, purpose, code), 'hex')
  const stored = Buffer.from(row.code_hash as string, 'hex')
  if (given.length !== stored.length || !timingSafeEqual(given, stored)) {
    await sql`UPDATE auth_codes SET attempts = attempts + 1 WHERE id = ${row.id}`
    throw new HttpError(400, 'Incorrect code. Try again.')
  }
  await sql`DELETE FROM auth_codes WHERE uid = ${uid} AND purpose = ${purpose}`
}
