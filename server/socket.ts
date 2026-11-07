import type { Server as HttpServer } from 'http'
import { Server, type Socket } from 'socket.io'
import { adminAuth, adminDb } from '../src/lib/server/admin'

const MAX_TEXT = 4000
const MAX_ATTACHMENT = 1_000_000

interface ConvInfo { members: string[]; at: number }
const convCache = new Map<string, ConvInfo>()

async function members(cid: string): Promise<string[]> {
  const hit = convCache.get(cid)
  if (hit && Date.now() - hit.at < 30_000) return hit.members
  const snap = await adminDb().collection('conversations').doc(cid).get()
  const list = snap.exists ? ((snap.data()!.members as string[]) ?? []) : []
  convCache.set(cid, { members: list, at: Date.now() })
  return list
}

const isString = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max

export function attachSocket(http: HttpServer) {
  const origins = (process.env.SOCKET_CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const io = new Server(http, {
    path: '/socket.io',
    cors: { origin: origins.length ? origins : false, credentials: true },
    maxHttpBufferSize: 2e6,
  })

  const online = new Map<string, number>() // uid → open sockets

  // Every connection must present a valid Firebase ID token.
  io.use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth as { token?: string })?.token
      if (!token) throw new Error('missing token')
      const decoded = await adminAuth().verifyIdToken(token)
      const profile = await adminDb().collection('users').doc(decoded.uid).get()
      socket.data.uid = decoded.uid
      socket.data.name = (profile.data()?.displayName as string) || decoded.name || 'User'
      next()
    } catch {
      next(new Error('unauthorized'))
    }
  })

  io.on('connection', (socket: Socket) => {
    const uid = socket.data.uid as string
    const name = socket.data.name as string
    socket.join(`u:${uid}`)

    const count = (online.get(uid) ?? 0) + 1
    online.set(uid, count)
    if (count === 1) io.emit('presence:update', { uid, online: true })
    socket.emit('presence:list', [...online.keys()])

    socket.on('room:join', async (cid: unknown) => {
      if (!isString(cid, 200)) return
      if ((await members(cid)).includes(uid)) socket.join(`c:${cid}`)
    })
    socket.on('room:leave', (cid: unknown) => { if (isString(cid, 200)) socket.leave(`c:${cid}`) })

    socket.on('message:send', async (draft: any, ack?: (r: unknown) => void) => {
      const reply = typeof ack === 'function' ? ack : () => {}
      try {
        if (!draft || !isString(draft.cid, 200) || !isString(draft.text ?? '', MAX_TEXT)) throw new Error('Invalid message')
        if (!(await members(draft.cid)).includes(uid)) throw new Error('You are not a member of this chat')
        if (draft.attachment && !isString(draft.attachment.dataUrl, MAX_ATTACHMENT)) throw new Error('Attachment is too large')
        if (!(draft.text ?? '').trim() && !draft.attachment) throw new Error('Empty message')

        const createdAt = Date.now()
        const db = adminDb()
        const msgRef = db.collection('conversations').doc(draft.cid).collection('messages').doc()
        const body: Record<string, unknown> = { senderId: uid, senderName: name, text: draft.text ?? '', createdAt }
        if (draft.replyTo) body.replyTo = { id: String(draft.replyTo.id), senderName: String(draft.replyTo.senderName).slice(0, 80), text: String(draft.replyTo.text).slice(0, 200) }
        if (draft.forwardedFrom) body.forwardedFrom = String(draft.forwardedFrom).slice(0, 80)
        if (draft.attachment) body.attachment = draft.attachment

        const preview = (draft.text ?? '').trim() || (draft.attachment?.kind === 'image' ? '📷 Photo' : `📎 ${draft.attachment?.name ?? 'File'}`)
        const batch = db.batch()
        batch.set(msgRef, body)
        batch.update(db.collection('conversations').doc(draft.cid), {
          lastMessage: { text: preview.slice(0, 140), senderId: uid, senderName: name, at: createdAt },
          updatedAt: createdAt,
        })
        await batch.commit()

        const message = { id: msgRef.id, cid: draft.cid, ...body }
        io.to(`c:${draft.cid}`).emit('message:new', message)
        reply({ ok: true, message })
      } catch (e) {
        reply({ ok: false, error: (e as Error).message })
      }
    })

    socket.on('typing', (e: { cid?: unknown; typing?: unknown }) => {
      if (!isString(e?.cid, 200) || !socket.rooms.has(`c:${e.cid}`)) return
      socket.to(`c:${e.cid}`).emit('typing', { cid: e.cid, uid, typing: !!e.typing })
    })

    socket.on('signal', (e: { to?: unknown; payload?: unknown }) => {
      if (!isString(e?.to, 200) || typeof e.payload !== 'object' || !e.payload) return
      io.to(`u:${e.to}`).emit('signal', { from: uid, payload: e.payload })
    })

    socket.on('disconnect', () => {
      const left = (online.get(uid) ?? 1) - 1
      if (left <= 0) {
        online.delete(uid)
        io.emit('presence:update', { uid, online: false })
        adminDb().collection('users').doc(uid).set({ lastSeen: Date.now() }, { merge: true }).catch(() => {})
      } else online.set(uid, left)
    })
  })

  return io
}
