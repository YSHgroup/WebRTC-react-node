import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getDatabase, ServerValue } from 'firebase-admin/database'

/**
 * Firebase is used ONLY as a realtime pipe (Realtime Database). Passwords, emails and phone numbers
 * never go to Firebase: people sign in with this app, and the server hands the browser a short-lived
 * custom token that carries nothing but the user id.
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

function adminApp(): App {
  if (getApps().length) return getApp()
  const account = readServiceAccount()
  if (!account || !process.env.FIREBASE_DATABASE_URL) {
    throw new Error('Firebase realtime is not configured (service account and FIREBASE_DATABASE_URL are required).')
  }
  return initializeApp({ credential: cert(account), databaseURL: process.env.FIREBASE_DATABASE_URL })
}

/** Public web config that the browser needs. Served at runtime, so no rebuild is needed when it changes. */
export function publicWebConfig() {
  const account = readServiceAccount()
  return {
    apiKey: process.env.FIREBASE_API_KEY!,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || (account ? `${account.projectId}.firebaseapp.com` : ''),
    databaseURL: process.env.FIREBASE_DATABASE_URL!,
    projectId: account?.projectId ?? '',
    appId: process.env.FIREBASE_APP_ID || undefined,
  }
}

export const mintRealtimeToken = (uid: string) => getAuth(adminApp()).createCustomToken(uid)

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
