import { api, ApiError } from '@/lib/api'
import type { Conversation, Me, Message, MessageDraft, PendingAttachment, Attachment, UserProfile } from '@/lib/types'

/* ---------------- bootstrap & directory ---------------- */

export interface Bootstrap { me: Me; users: UserProfile[]; conversations: Conversation[] }

export const loadBootstrap = () => api<Bootstrap>('/api/bootstrap')
export const fetchUsers = () => api<{ users: UserProfile[] }>('/api/users').then((r) => r.users)
export const fetchConversations = () => api<{ conversations: Conversation[] }>('/api/conversations').then((r) => r.conversations)

/* ---------------- profile ---------------- */

export async function updateProfile(patch: { displayName?: string; bio?: string; phone?: string | null; photoDataUrl?: string | null }) {
  const r = await api<{ user: Me }>('/api/profile', { method: 'PATCH', body: patch })
  return r.user
}

/* ---------------- conversations ---------------- */

export async function openDm(_me: string, other: string) {
  const r = await api<{ id: string }>('/api/conversations', { body: { type: 'dm', userId: other } })
  const { useChat } = await import('@/store/chat')
  useChat.getState().setConversations(await fetchConversations())
  return r.id
}

export async function createGroup(_uid: string, name: string, description: string, memberIds: string[] = [], isPublic = false) {
  const r = await api<{ id: string }>('/api/conversations', { body: { type: 'group', name, description, memberIds, isPublic } })
  return r.id
}

export const fetchPublicGroups = (q = '') =>
  api<{ conversations: Conversation[] }>(`/api/conversations?public=true&q=${encodeURIComponent(q)}`).then((r) => r.conversations)

export const joinPublicGroup = (cid: string) =>
  api<{ ok: true }>(`/api/conversations/${cid}/join`, { body: {} }).then(async () => {
    const { useChat } = await import('@/store/chat')
    useChat.getState().setConversations(await fetchConversations())
  })

export const addMembers = (cid: string, userIds: string[]) =>
  api(`/api/conversations/${cid}/members`, { body: { userIds } })

export const leaveGroup = (cid: string, _uid?: string) =>
  api(`/api/conversations/${cid}/members`, { method: 'DELETE' })

export const markRead = (cid: string) =>
  api(`/api/conversations/${cid}/read`, { method: 'POST', body: {} }).catch(() => {})

/* ---------------- messages ---------------- */

export async function fetchMessages(cid: string, count = 40, before?: number): Promise<Message[]> {
  const q = new URLSearchParams({ limit: String(count) })
  if (before) q.set('before', String(before))
  return (await api<{ messages: Message[] }>(`/api/messages/${cid}?${q}`)).messages
}

/** Everything newer than `after` (used to catch up after a dropped connection). */
export async function fetchMessagesAfter(cid: string, after: number): Promise<Message[]> {
  return (await api<{ messages: Message[] }>(`/api/messages/${cid}?after=${after}&limit=100`)).messages
}

export async function uploadAttachment(file: PendingAttachment): Promise<Attachment> {
  const form = new FormData()
  form.set('file', file.file, file.name)
  return (await api<{ attachment: Attachment }>('/api/attachments', { form })).attachment
}

/** Sends a message. The id is generated here, so retrying after a network error can never duplicate it. */
export async function sendMessage(draft: MessageDraft): Promise<Message> {
  const { cid, ...rest } = draft
  const body = { ...rest, id: crypto.randomUUID() }
  try {
    return (await api<{ message: Message }>(`/api/messages/${cid}`, { body })).message
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 0) throw e
    await new Promise((r) => setTimeout(r, 800))
    return (await api<{ message: Message }>(`/api/messages/${cid}`, { body })).message
  }
}
