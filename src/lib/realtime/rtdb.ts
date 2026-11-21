import { deleteApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, signInWithCustomToken } from 'firebase/auth'
import {
  getDatabase, onChildAdded, onDisconnect, onValue, push, ref, remove, serverTimestamp, set, type Database,
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
 * Realtime pipe on Firebase Realtime Database. The browser signs in with a custom token minted by our server
 * (it carries only the user id), so no password, email or phone number is ever stored in Firebase.
 * Data of record stays in Postgres; this only delivers "something happened" events, presence, typing and call signals.
 */
export async function connectRealtime(): Promise<Transport> {
  const { token, uid, config } = await api<TokenResponse>('/api/realtime/token')

  const existing = getApps().find((a) => a.name === APP_NAME)
  if (existing) await deleteApp(existing).catch(() => {})
  const app: FirebaseApp = initializeApp(config, APP_NAME)
  await signInWithCustomToken(getAuth(app), token)
  const db: Database = getDatabase(app)

  let offset = 0
  const unsubs: Unsub[] = [onValue(ref(db, '.info/serverTimeOffset'), (s) => { offset = Number(s.val()) || 0 })]
  const serverNow = () => Date.now() + offset

  // ---- presence: onDisconnect makes "offline" reliable even if the tab is killed ----
  const mine = ref(db, `presence/${uid}`)
  unsubs.push(
    onValue(ref(db, '.info/connected'), (s) => {
      if (s.val() !== true) return
      onDisconnect(mine)
        .set({ online: false, at: serverTimestamp() })
        .then(() => set(mine, { online: true, at: serverTimestamp() }))
        .catch(() => {})
    }),
  )

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
