import { create } from 'zustand'
import type { Conversation, Message, UserProfile } from '@/lib/types'
import { useAuth } from './auth'

interface ChatState {
  users: Record<string, UserProfile>
  conversations: Conversation[]
  presence: Record<string, boolean>
  unread: Record<string, number>
  activeCid: string | null
  messages: Record<string, Message[]>
  typing: Record<string, Record<string, boolean>>
  ready: boolean
  setUsers: (list: UserProfile[]) => void
  setConversations: (list: Conversation[]) => void
  setPresence: (p: Record<string, boolean>) => void
  setActive: (cid: string | null) => void
  mergeMessages: (cid: string, msgs: Message[]) => void
  removeMessage: (cid: string, id: string) => void
  setTyping: (cid: string, uid: string, on: boolean) => void
  reset: () => void
}

const initial = {
  users: {}, conversations: [], presence: {}, unread: {}, activeCid: null, messages: {}, typing: {}, ready: false,
}

export const useChat = create<ChatState>((set, get) => ({
  ...initial,

  setUsers: (list) => set({ users: Object.fromEntries(list.map((u) => [u.uid, u])) }),

  setConversations: (list) => {
    const me = useAuth.getState().user?.uid
    const prev = new Map(get().conversations.map((c) => [c.id, c]))
    const unread = { ...get().unread }
    const first = prev.size === 0
    for (const c of list) {
      const before = prev.get(c.id)?.lastMessage?.at ?? 0
      const lm = c.lastMessage
      if (!first && lm && lm.at > before && lm.senderId !== me && c.id !== get().activeCid) {
        unread[c.id] = (unread[c.id] ?? 0) + 1
      }
    }
    set({ conversations: list, unread, ready: true })
  },

  setPresence: (presence) => set({ presence }),

  setActive: (cid) => set((s) => ({ activeCid: cid, unread: cid ? { ...s.unread, [cid]: 0 } : s.unread })),

  mergeMessages: (cid, msgs) =>
    set((s) => {
      const map = new Map((s.messages[cid] ?? []).map((m) => [m.id, m]))
      msgs.forEach((m) => map.set(m.id, m))
      const merged = [...map.values()].sort((a, b) => a.createdAt - b.createdAt)
      return { messages: { ...s.messages, [cid]: merged } }
    }),

  removeMessage: (cid, id) =>
    set((s) => ({ messages: { ...s.messages, [cid]: (s.messages[cid] ?? []).filter((m) => m.id !== id) } })),

  setTyping: (cid, uid, on) =>
    set((s) => {
      const cur = { ...(s.typing[cid] ?? {}) }
      if (on) cur[uid] = true
      else delete cur[uid]
      return { typing: { ...s.typing, [cid]: cur } }
    }),

  reset: () => set(initial),
}))

/** Title + avatar helpers shared by list, header and panels. */
export function conversationMeta(c: Conversation, users: Record<string, UserProfile>, me: string) {
  if (c.type === 'group') {
    return { title: c.name ?? 'Group', other: null as UserProfile | null, color: c.color ?? '#7C5CFF' }
  }
  const otherId = c.members.find((m) => m !== me) ?? me
  const other = users[otherId] ?? null
  return { title: other?.displayName ?? 'Unknown user', other, color: undefined as string | undefined }
}
