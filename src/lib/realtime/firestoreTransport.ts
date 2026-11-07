import type { User } from 'firebase/auth'
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { subscribeNewMessages, writeMessage } from '@/lib/chat/data'
import type { SignalPayload, Transport, Unsub } from './types'

const HEARTBEAT_MS = 90_000
const STALE_MS = 200_000

/** Vercel-compatible transport: Firestore listeners carry messages, typing, presence and call signalling. */
export function createFirestoreTransport(): Transport {
  let me: string | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  let visHandler: (() => void) | null = null

  const setOnline = (online: boolean) => {
    if (!me) return
    setDoc(doc(db, 'users', me), { online, lastSeen: Date.now() }, { merge: true }).catch(() => {})
  }

  return {
    mode: 'firestore',

    async start(user: User) {
      me = user.uid
      setOnline(true)
      timer = setInterval(() => document.visibilityState === 'visible' && setOnline(true), HEARTBEAT_MS)
      visHandler = () => setOnline(document.visibilityState === 'visible')
      document.addEventListener('visibilitychange', visHandler)
      window.addEventListener('pagehide', visHandler)
    },

    stop() {
      if (timer) clearInterval(timer)
      if (visHandler) {
        document.removeEventListener('visibilitychange', visHandler)
        window.removeEventListener('pagehide', visHandler)
      }
      setOnline(false)
      me = null
    },

    sendMessage: (draft) => writeMessage(draft),

    // 60s of tolerance for clock differences between devices; the store de-duplicates by id
    subscribeMessages: (cid, since, cb) => subscribeNewMessages(cid, since - 60_000, cb),

    sendTyping(cid, typing) {
      if (!me) return
      const ref = doc(db, 'conversations', cid, 'typing', me)
      if (typing) setDoc(ref, { at: Date.now() }).catch(() => {})
      else deleteDoc(ref).catch(() => {})
    },

    subscribeTyping(cid, cb) {
      return onSnapshot(collection(db, 'conversations', cid, 'typing'), (s) =>
        s.docChanges().forEach((ch) => {
          if (ch.doc.id === me) return
          const fresh = Date.now() - ((ch.doc.data().at as number) ?? 0) < 6000
          cb(ch.doc.id, ch.type !== 'removed' && fresh)
        }),
      )
    },

    onPresence(cb) {
      let last: { id: string; lastSeen?: number }[] = []
      const compute = () => {
        const map: Record<string, boolean> = {}
        last.forEach((d) => { if (Date.now() - (d.lastSeen ?? 0) < STALE_MS) map[d.id] = true })
        cb(map)
      }
      const unsub = onSnapshot(query(collection(db, 'users'), where('online', '==', true)), (s) => {
        last = s.docs.map((d) => ({ id: d.id, lastSeen: d.data().lastSeen as number | undefined }))
        compute()
      })
      const t = setInterval(compute, 30_000) // age out people who closed the tab silently
      return () => { unsub(); clearInterval(t) }
    },

    async sendSignal(to, payload) {
      if (!me) return
      await addDoc(collection(db, 'signals'), { to, from: me, payload: JSON.stringify(payload), createdAt: Date.now() })
    },

    onSignal(cb): Unsub {
      if (!me) return () => {}
      return onSnapshot(query(collection(db, 'signals'), where('to', '==', me)), (s) =>
        s.docChanges().forEach((ch) => {
          if (ch.type !== 'added') return
          const d = ch.doc.data()
          deleteDoc(ch.doc.ref).catch(() => {})
          if (Date.now() - (d.createdAt as number) > 60_000) return // stale ring
          cb(d.from as string, JSON.parse(d.payload as string) as SignalPayload)
        }),
      )
    },
  }
}
