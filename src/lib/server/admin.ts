import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function app() {
  if (getApps().length) return getApp()
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
    throw new Error('Firebase Admin credentials are missing (FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY).')
  }
  return initializeApp({
    credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey }),
  })
}

export const adminAuth = () => getAuth(app())
export const adminDb = () => getFirestore(app())

/** Reads a Bearer Authorization header and returns the verified Firebase token. */
export async function verifyRequest(req: Request) {
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) throw new Error('unauthenticated')
  try {
    return await adminAuth().verifyIdToken(token)
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code?.includes('auth/invalid') || code?.includes('auth/argument-error')) {
      throw new Error('invalid-token')
    }
    throw error
  }
}
