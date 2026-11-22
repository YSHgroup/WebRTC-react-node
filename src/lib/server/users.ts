import { randomUUID } from 'node:crypto'
import { getSql, type Row } from './db'

export const emailVerificationRequired = () => process.env.REQUIRE_EMAIL_VERIFICATION !== 'false'
const showContact = () => process.env.DIRECTORY_SHOW_CONTACT !== 'false'

export interface PublicUser {
  uid: string
  displayName: string
  email: string | null
  phone: string | null
  photoURL: string | null
  bio: string
  createdAt: number
}

export interface Me extends PublicUser {
  email: string | null
  emailVerified: boolean
  phoneVerified: boolean
  hasPassword: boolean
  hasGoogle: boolean
  needsVerification: boolean
}

const photoFor = (r: Row): string | null =>
  r.photo_data ? `/api/avatar/${r.id}?v=${r.photo_version}` : (r.photo_url ?? null)

export function toMe(r: Row): Me {
  const hasGoogle = !!r.google_sub || !!r.firebase_google
  return {
    uid: r.id,
    displayName: r.display_name,
    email: r.email ?? null,
    phone: r.phone ?? null,
    photoURL: photoFor(r),
    bio: r.bio ?? '',
    createdAt: Number(r.created_at),
    emailVerified: !!r.email_verified,
    phoneVerified: !!r.phone_verified,
    hasPassword: !!r.password_hash,
    hasGoogle,
    needsVerification: (emailVerificationRequired() && !!r.email && !r.email_verified)
      || (!!r.phone && !r.phone_verified),
  }
}

/** What other signed-in people may see. Contact details can be hidden with DIRECTORY_SHOW_CONTACT=false. */
export function toPublic(r: Row): PublicUser {
  const open = showContact()
  return {
    uid: r.id,
    displayName: r.display_name,
    email: open ? (r.email ?? null) : null,
    phone: open ? (r.phone ?? null) : null,
    photoURL: photoFor(r),
    bio: r.bio ?? '',
    createdAt: Number(r.created_at),
  }
}

/** Adds the person to every public default group (Development, HR, Introduction, Partners, Topic-off). */
export async function joinDefaultGroups(uid: string) {
  const now = Date.now()
  await getSql()`
    INSERT INTO conversation_members (cid, uid, role, joined_at, last_read_at)
    SELECT id, ${uid}, 'member', ${now}::bigint, ${now}::bigint
    FROM conversations WHERE type = 'group' AND is_public = true
    ON CONFLICT DO NOTHING`
}

export async function createUser(input: {
  name: string
  email?: string | null
  phone?: string | null
  passwordHash?: string | null
  googleSub?: string | null
  firebaseUid?: string | null
  firebaseGoogle?: boolean
  emailVerified?: boolean
  phoneVerified?: boolean
  photoUrl?: string | null
}): Promise<Row> {
  const id = randomUUID()
  const rows = await getSql()`
    INSERT INTO users (id, display_name, email, phone, password_hash, google_sub, firebase_uid, firebase_google, email_verified, phone_verified, photo_url, created_at, last_login_at)
    VALUES (${id}, ${input.name}, ${input.email ?? null}, ${input.phone ?? null}, ${input.passwordHash ?? null},
            ${input.googleSub ?? null}, ${input.firebaseUid ?? null}, ${input.firebaseGoogle ?? false}, ${input.emailVerified ?? false},
            ${input.phoneVerified ?? false}, ${input.photoUrl ?? null},
            ${Date.now()}::bigint, ${Date.now()}::bigint)
    RETURNING *`
  await joinDefaultGroups(id)
  return rows[0]
}

export async function findByIdentifier(identifier: { email?: string; phone?: string }): Promise<Row | null> {
  const sql = getSql()
  const rows = identifier.email
    ? await sql`SELECT * FROM users WHERE lower(email) = ${identifier.email.toLowerCase()}`
    : await sql`SELECT * FROM users WHERE phone = ${identifier.phone ?? ''}`
  return rows[0] ?? null
}
