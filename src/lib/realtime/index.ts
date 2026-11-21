import { connectRealtime } from './rtdb'
import type { Transport } from './types'

let current: Transport | null = null
let connecting: Promise<Transport> | null = null

/** Opens (once) the realtime connection. Rejects when realtime is not configured; the app then falls back to polling. */
export function startTransport(): Promise<Transport> {
  if (current) return Promise.resolve(current)
  if (!connecting) {
    connecting = connectRealtime()
      .then((t) => { current = t; return t })
      .finally(() => { connecting = null })
  }
  return connecting
}

/** The live transport, or null when realtime is offline / not yet connected. */
export const getTransport = (): Transport | null => current

export function stopTransport() {
  current?.stop()
  current = null
}

export type { InboxEvent, PresenceInfo, SignalPayload, Transport } from './types'
