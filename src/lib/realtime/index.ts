import { createFirestoreTransport } from './firestoreTransport'
import { createSocketTransport } from './socketTransport'
import type { Transport } from './types'

let instance: Transport | null = null

/** NEXT_PUBLIC_REALTIME=socket → Socket.io, anything else → Firestore (works on Vercel). */
export function getTransport(): Transport {
  if (!instance) {
    instance = process.env.NEXT_PUBLIC_REALTIME === 'socket' ? createSocketTransport() : createFirestoreTransport()
  }
  return instance
}

export function resetTransport() {
  instance = null
}

export type { SignalPayload, Transport } from './types'
