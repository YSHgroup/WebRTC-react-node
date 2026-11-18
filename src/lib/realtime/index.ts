import { createFirestoreTransport } from './firestoreTransport'
import type { Transport } from './types'

let instance: Transport | null = null

/** Firestore listeners provide realtime without requiring a persistent WebSocket server. */
export function getTransport(): Transport {
  if (!instance) instance = createFirestoreTransport()
  return instance
}

export function resetTransport() {
  instance = null
}

export type { SignalPayload, Transport } from './types'
