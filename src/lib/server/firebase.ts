import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth'
import { getDatabase, ServerValue } from 'firebase-admin/database'
import { HttpError } from './http'

/**
 * Firebase Auth verifies Google and phone sign-in tokens. Neon remains the application user store;
 * Realtime Database is used only as a transport for live events.
 */

interface ServiceAccount { projectId: string; clientEmail: string; privateKey: string }

function readServiceAccount(): ServiceAccount | null {
  const blob = process.env.FIREBASE_SERVICE_ACCOUNT?.trim()
  if (blob) {
    try {
      const json = JSON.parse(blob.startsWith('{') ? blob : Buffer.from(blob, 'base64').toString('utf8'))
      return { projectId: json.project_id, clientEmail: json.client_email, privateKey: String(json.private_key).replace(/\\n/g, '\n') }
    } catch {
      throw new Error('Firebase: FIREBASE_SERVICE_ACCOUNT is not valid JSON (or base64 of the JSON).')
    }
  }
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim().replace(/^"|"$/g, '').replace(/\\n/g, '\n')
  if (projectId && clientEmail && privateKey) return { projectId, clientEmail, privateKey }
  return null
}

export function realtimeConfigured(): boolean {
  try {
    return !!readServiceAccount() && !!process.env.FIREBASE_DATABASE_URL && !!process.env.FIREBASE_API_KEY
  } catch {
    return false
  }
}

export function firebaseAuthConfigured(): boolean {
  try {
    const account = readServiceAccount()
    return !!account && !!process.env.FIREBASE_API_KEY && !!process.env.FIREBASE_APP_ID
      && !!(account.projectId || process.env.FIREBASE_PROJECT_ID)
  } catch {
    return false
  }
}

function adminApp(): App {
  if (getApps().length) return getApp()
  const account = readServiceAccount()
  if (!account) throw new Error('Firebase is not configured (FIREBASE_SERVICE_ACCOUNT is required).')
  return initializeApp({
    credential: cert(account),
    ...(process.env.FIREBASE_DATABASE_URL ? { databaseURL: process.env.FIREBASE_DATABASE_URL } : {}),
  })
}

/** Public web config that the browser needs. Served at runtime, so no rebuild is needed when it changes. */
export function publicWebConfig() {
  const account = readServiceAccount()
  const projectId = account?.projectId ?? process.env.FIREBASE_PROJECT_ID
  if (!projectId || !process.env.FIREBASE_API_KEY) {
    throw new Error('Firebase web configuration is missing the project ID or API key.')
  }
  return {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    appId: process.env.FIREBASE_APP_ID || undefined,
    ...(process.env.FIREBASE_DATABASE_URL ? { databaseURL: process.env.FIREBASE_DATABASE_URL } : {}),
  }
}

export const mintRealtimeToken = (uid: string) => getAuth(adminApp()).createCustomToken(uid)

export async function verifyFirebaseIdToken(token: string): Promise<DecodedIdToken> {
  try {
    return await getAuth(adminApp()).verifyIdToken(token)
  } catch (error) {
    const code = (error as { code?: unknown }).code
    if (typeof code === 'string' && [
      'auth/argument-error',
      'auth/id-token-expired',
      'auth/id-token-revoked',
      'auth/invalid-id-token',
      'auth/user-disabled',
      'auth/user-not-found',
    ].includes(code)) {
      throw new HttpError(401, 'Firebase sign-in expired or is invalid. Please try again.')
    }
    throw error
  }
}

/** Drops an event into each person's private inbox with one atomic write. Never throws: messages are already saved. */
export async function publish(uids: string[], event: Record<string, unknown>) {
  if (!realtimeConfigured() || !uids.length) return
  try {
    const db = getDatabase(adminApp())
    const key = db.ref().push().key as string
    const updates: Record<string, unknown> = {}
    for (const uid of new Set(uids)) updates[`inbox/${uid}/${key}`] = { ...event, at: ServerValue.TIMESTAMP }
    await db.ref().update(updates)
  } catch (error) {
    console.error('[realtime] publish failed — clients will catch up when they resync', error)
  }
}

/** Removes inbox/signal entries older than a week for people who were offline. */
export async function pruneStale(uid: string) {
  const db = getDatabase(adminApp())
  const cutoff = Date.now() - 7 * 24 * 3600_000
  for (const path of ['inbox', 'signals']) {
    const snap = await db.ref(`${path}/${uid}`).orderByChild('at').endAt(cutoff).once('value')
    if (!snap.exists()) continue
    const updates: Record<string, null> = {}
    snap.forEach((child) => { updates[child.key as string] = null })
    await db.ref(`${path}/${uid}`).update(updates)
  }
}
