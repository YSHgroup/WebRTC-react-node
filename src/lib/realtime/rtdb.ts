import { deleteApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, signInWithCustomToken } from 'firebase/auth'
import {
  get as getValue, getDatabase, limitToFirst, onChildAdded, onDisconnect, onValue, push, query, ref, remove,
  serverTimestamp, set, type Database,
} from 'firebase/database'
import { api } from '@/lib/api'
import type { InboxEvent, PresenceInfo, SignalPayload, Transport, Unsub } from './types'

interface TokenResponse {
  token: string
  uid: string
  config: { apiKey: string; authDomain: string; databaseURL: string; projectId: string; appId?: string }
}

const APP_NAME = 'huddle-realtime'
const TYPING_FRESH_MS = 8000
const SIGNAL_STALE_MS = 60_000

/**
 * Realtime pipe on Firebase Realtime Database. The browser signs in with a custom token minted by our server.
 * Data of record stays in Postgres; this only delivers "something happened" events, presence, typing and call signals.
 */
export async function connectRealtime(): Promise<Transport> {
  const { token, uid, config } = await api<TokenResponse>('/api/realtime/token')

  const existing = getApps().find((a) => a.name === APP_NAME)
  if (existing) await deleteApp(existing).catch(() => {})
  const app: FirebaseApp = initializeApp(config, APP_NAME)
  let db: Database
  try {
    await signInWithCustomToken(getAuth(app), token)
    db = getDatabase(app)
  } catch (error) {
    await deleteApp(app).catch(() => {})
    throw error
  }

  let offset = 0
  const unsubs: Unsub[] = []
  const serverNow = () => Date.now() + offset

  const mine = ref(db, `presence/${uid}`)
  try {
    let probeTimeout: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        Promise.all([
          getValue(query(ref(db, `inbox/${uid}`), limitToFirst(1))),
          getValue(query(ref(db, `signals/${uid}`), limitToFirst(1))),
          getValue(ref(db, `presence/${uid}`)),
        ]),
        new Promise<never>((_, reject) => {
          probeTimeout = setTimeout(
            () => reject(new Error('Firebase Realtime Database did not answer within 15 seconds. Check its URL and network access.')),
            15_000,
          )
        }),
      ])
    } finally {
      if (probeTimeout) clearTimeout(probeTimeout)
    }
  } catch (error) {
    await deleteApp(app).catch(() => {})
    throw new Error(`Firebase Realtime Database access failed. Check database rules and project configuration. ${error instanceof Error ? error.message : ''}`.trim())
  }

  unsubs.push(onValue(ref(db, '.info/serverTimeOffset'), (s) => { offset = Number(s.val()) || 0 }))

  // Verify presence writes before considering realtime ready, then re-register after reconnects.
  let setupPresence: Promise<void> | null = null
  let resolveInitial: (() => void) | null = null
  let rejectInitial: ((error: Error) => void) | null = null
  const initialPresence = new Promise<void>((resolve, reject) => {
    resolveInitial = resolve
    rejectInitial = reject
  })
  const presenceTimeout = setTimeout(
    () => rejectInitial?.(new Error('Firebase Realtime Database did not connect within 15 seconds. Check its URL, rules, and network access.')),
    15_000,
  )

  unsubs.push(onValue(ref(db, '.info/connected'), (snapshot) => {
    if (snapshot.val() !== true) {
      setupPresence = null
      return
    }
    if (setupPresence) return
    setupPresence = onDisconnect(mine)
      .set({ online: false, at: serverTimestamp() })
      .then(() => set(mine, { online: true, at: serverTimestamp() }))
      .then(() => {
        clearTimeout(presenceTimeout)
        resolveInitial?.()
        resolveInitial = null
        rejectInitial = null
      })
      .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : String(error)
        const failure = new Error(`Firebase could not publish presence. Check the Realtime Database rules. ${detail}`)
        rejectInitial?.(failure)
        console.error('[realtime] presence setup failed', error)
        setupPresence = null
      })
  }, (error) => {
    clearTimeout(presenceTimeout)
    rejectInitial?.(new Error(`Firebase connection listener failed: ${error.message}`))
  }))

  try {
    await initialPresence
  } catch (error) {
    clearTimeout(presenceTimeout)
    unsubs.forEach((unsubscribe) => unsubscribe())
    await deleteApp(app).catch(() => {})
    throw error
  }

  const transport: Transport = {
    uid,
    serverNow,

    stop() {
      unsubs.forEach((u) => u())
      set(mine, { online: false, at: serverTimestamp() }).catch(() => {})
      deleteApp(app).catch(() => {})
    },

    onConnection(cb) {
      return onValue(ref(db, '.info/connected'), (s) => cb(s.val() === true))
    },

    onInbox(cb) {
      const inbox = ref(db, `inbox/${uid}`)
      // child_added also replays anything that arrived while we were offline, oldest first
      return onChildAdded(inbox, (snap) => {
        const value = snap.val() as InboxEvent | null
        remove(snap.ref).catch(() => {})
        if (value) cb(value)
      })
    },

    onPresence(cb) {
      return onValue(ref(db, 'presence'), (s) => {
        const info: PresenceInfo = { online: {}, lastSeen: {} }
        s.forEach((child) => {
          const v = child.val() as { online?: boolean; at?: number }
          if (v?.online) info.online[child.key as string] = true
          if (v?.at) info.lastSeen[child.key as string] = v.at
        })
        cb(info)
      })
    },

    sendTyping(cid, typing) {
      const node = ref(db, `typing/${cid}/${uid}`)
      if (typing) {
        onDisconnect(node).remove().catch(() => {})
        set(node, serverTimestamp()).catch(() => {})
      } else remove(node).catch(() => {})
    },

    subscribeTyping(cid, cb) {
      let active = new Set<string>()
      const sweep = (values: Record<string, number>) => {
        const next = new Set(Object.keys(values).filter((id) => id !== uid && serverNow() - values[id] < TYPING_FRESH_MS))
        active.forEach((id) => { if (!next.has(id)) cb(id, false) })
        next.forEach((id) => { if (!active.has(id)) cb(id, true) })
        active = next
      }
      let last: Record<string, number> = {}
      const off = onValue(ref(db, `typing/${cid}`), (s) => { last = (s.val() ?? {}) as Record<string, number>; sweep(last) })
      const timer = setInterval(() => sweep(last), 2000) // expire people who stopped without clearing the flag
      return () => { off(); clearInterval(timer) }
    },

    async sendSignal(to, payload: SignalPayload) {
      await set(push(ref(db, `signals/${to}`)), { from: uid, at: serverTimestamp(), payload: JSON.stringify(payload) })
    },

    onSignal(cb) {
      return onChildAdded(ref(db, `signals/${uid}`), (snap) => {
        const v = snap.val() as { from: string; at: number; payload: string } | null
        remove(snap.ref).catch(() => {})
        if (!v || serverNow() - (v.at ?? 0) > SIGNAL_STALE_MS) return // ignore stale rings
        try { cb(v.from, JSON.parse(v.payload) as SignalPayload) } catch { /* malformed */ }
      })
    },
  }
  return transport
}
