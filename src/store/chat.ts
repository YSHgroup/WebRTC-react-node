import { create } from 'zustand'
import type { Conversation, Message, UserProfile } from '@/lib/types'

interface ChatState {
  users: Record<string, UserProfile>
  conversations: Conversation[]
  presence: Record<string, boolean>
  unread: Record<string, number>
  activeCid: string | null
  messages: Record<string, Message[]>
  typing: Record<string, Record<string, boolean>>
  ready: boolean
  /** true while the realtime connection is up; false means we are polling */
  live: boolean
  liveError: string | null
  setUsers: (list: UserProfile[]) => void
  setConversations: (list: Conversation[]) => void
  setPresence: (online: Record<string, boolean>, lastSeen: Record<string, number>) => void
  setLive: (live: boolean, error?: string) => void
  setActive: (cid: string | null) => void
  mergeMessages: (cid: string, msgs: Message[]) => void
  /** Applies one incoming message to the conversation list (preview, order, unread) and, if loaded, its history. */
  receiveMessage: (msg: Message, me: string) => void
  setTyping: (cid: string, uid: string, on: boolean) => void
  reset: () => void
}

const initial = {
  users: {}, conversations: [], presence: {}, unread: {}, activeCid: null, messages: {}, typing: {}, ready: false, live: false, liveError: null,
}

const previewOf = (m: Message) => m.text.trim() || (m.attachment ? (m.attachment.kind === 'image' ? '📷 Photo' : `📎 ${m.attachment.name}`) : '')

export const useChat = create<ChatState>((set, get) => ({
  ...initial,

  setUsers: (list) =>
    set((s) => ({
      // keep presence-derived lastSeen when the directory is refreshed
      users: Object.fromEntries(list.map((u) => [u.uid, { ...u, lastSeen: s.users[u.uid]?.lastSeen }])),
    })),

  setConversations: (list) =>
    set((s) => ({
      conversations: list,
      // the open conversation is, by definition, read
      unread: Object.fromEntries(list.map((c) => [c.id, c.id === s.activeCid ? 0 : (c.unread ?? 0)])),
      ready: true,
    })),

  setPresence: (presence, lastSeen) =>
    set((s) => {
      const users = { ...s.users }
      for (const [uid, at] of Object.entries(lastSeen)) if (users[uid] && users[uid].lastSeen !== at) users[uid] = { ...users[uid], lastSeen: at }
      return { presence, users }
    }),

  setLive: (live, liveError) => set({
    live,
    liveError: live ? null : liveError ?? 'Realtime connection is unavailable. Retrying automatically.',
  }),

  setActive: (cid) => set((s) => ({ activeCid: cid, unread: cid ? { ...s.unread, [cid]: 0 } : s.unread })),

  mergeMessages: (cid, msgs) =>
    set((s) => {
      const map = new Map((s.messages[cid] ?? []).map((m) => [m.id, m]))
      msgs.forEach((m) => map.set(m.id, m))
      return { messages: { ...s.messages, [cid]: [...map.values()].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id)) } }
    }),

  receiveMessage: (msg, me) =>
    set((s) => {
      const conversations = s.conversations
        .map((c) =>
          c.id === msg.cid && (c.lastMessage?.at ?? 0) <= msg.createdAt
            ? { ...c, updatedAt: msg.createdAt, lastMessage: { text: previewOf(msg).slice(0, 140), senderId: msg.senderId, senderName: msg.senderName, at: msg.createdAt } }
            : c,
        )
        .sort((a, b) => b.updatedAt - a.updatedAt)
      const known = (s.messages[msg.cid] ?? []).some((m) => m.id === msg.id)
      const unread =
        msg.senderId !== me && msg.cid !== s.activeCid && !known
          ? { ...s.unread, [msg.cid]: (s.unread[msg.cid] ?? 0) + 1 }
          : s.unread
      const loaded = s.messages[msg.cid]
      return {
        conversations,
        unread,
        messages: loaded ? { ...s.messages, [msg.cid]: mergeOne(loaded, msg) } : s.messages,
      }
    }),

  setTyping: (cid, uid, on) =>
    set((s) => {
      const cur = { ...(s.typing[cid] ?? {}) }
      if (on) cur[uid] = true
      else delete cur[uid]
      return { typing: { ...s.typing, [cid]: cur } }
    }),

  reset: () => set(initial),
}))

function mergeOne(list: Message[], m: Message) {
  if (list.some((x) => x.id === m.id)) return list
  return [...list, m].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
}

/** Title + avatar helpers shared by list, header and panels. */
export function conversationMeta(c: Conversation, users: Record<string, UserProfile>, me: string) {
  if (c.type === 'group') {
    return { title: c.name ?? 'Group', other: null as UserProfile | null, color: c.color ?? '#7C5CFF' }
  }
  const otherId = c.members.find((m) => m !== me) ?? me
  const other = users[otherId] ?? null
  return { title: other?.displayName ?? 'Unknown user', other, color: undefined as string | undefined }
}
