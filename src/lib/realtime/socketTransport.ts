import type { User } from 'firebase/auth'
import { io, type Socket } from 'socket.io-client'
import type { Message, MessageDraft } from '@/lib/types'
import type { SignalPayload, Transport } from './types'

/** Socket.io transport. Needs a long-running Node host (see server/index.ts). */
export function createSocketTransport(): Transport {
  let socket: Socket | null = null
  const url = process.env.NEXT_PUBLIC_SOCKET_URL || undefined // undefined = same origin

  const need = () => {
    if (!socket) throw new Error('Realtime connection is not ready')
    return socket
  }

  return {
    mode: 'socket',

    async start(user: User) {
      const first = await user.getIdToken()
      socket = io(url, {
        path: '/socket.io',
        // fresh token on every (re)connect so an expired token never blocks reconnecting
        auth: (cb) => { user.getIdToken().then((t) => cb({ token: t })).catch(() => cb({ token: first })) },
        transports: ['websocket', 'polling'],
        reconnectionDelayMax: 8000,
      })
    },

    stop() {
      socket?.disconnect()
      socket = null
    },

    sendMessage(draft: MessageDraft) {
      return new Promise<Message>((resolve, reject) => {
        need()
          .timeout(10_000)
          .emit('message:send', draft, (err: Error | null, res?: { ok: boolean; message?: Message; error?: string }) => {
            if (err || !res?.ok || !res.message) reject(new Error(res?.error ?? 'Message was not delivered'))
            else resolve(res.message)
          })
      })
    },

    subscribeMessages(cid, _since, cb) {
      const s = need()
      const handler = (m: Message) => { if (m.cid === cid) cb(m) }
      const join = () => { s.emit('room:join', cid) }
      join()
      s.on('connect', join) // re-join after reconnects
      s.on('message:new', handler)
      return () => {
        s.off('message:new', handler)
        s.off('connect', join)
        s.emit('room:leave', cid)
      }
    },

    sendTyping: (cid, typing) => { socket?.emit('typing', { cid, typing }) },

    subscribeTyping(cid, cb) {
      const s = need()
      const h = (e: { cid: string; uid: string; typing: boolean }) => { if (e.cid === cid) cb(e.uid, e.typing) }
      s.on('typing', h)
      return () => { s.off('typing', h) }
    },

    onPresence(cb) {
      const s = need()
      const map: Record<string, boolean> = {}
      const list = (uids: string[]) => { uids.forEach((u) => { map[u] = true }); cb({ ...map }) }
      const upd = (e: { uid: string; online: boolean }) => {
        if (e.online) map[e.uid] = true
        else delete map[e.uid]
        cb({ ...map })
      }
      s.on('presence:list', list)
      s.on('presence:update', upd)
      return () => { s.off('presence:list', list); s.off('presence:update', upd) }
    },

    async sendSignal(to, payload: SignalPayload) {
      need().emit('signal', { to, payload })
    },

    onSignal(cb) {
      const s = need()
      const h = (e: { from: string; payload: SignalPayload }) => cb(e.from, e.payload)
      s.on('signal', h)
      return () => { s.off('signal', h) }
    },
  }
}
