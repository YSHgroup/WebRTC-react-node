import type { User } from 'firebase/auth'
import {
  arrayUnion, collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query,
  setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import {
  DEFAULT_GROUPS, dmId, type Conversation, type Message, type MessageDraft, type UserProfile,
} from '@/lib/types'

/* ---------------- users ---------------- */

export async function upsertProfile(user: User, extra: Partial<UserProfile> = {}) {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    // never overwrite what the person edited on their profile
    if (Object.keys(extra).length) await updateDoc(ref, extra)
    return
  }
  const profile: UserProfile = {
    uid: user.uid,
    displayName: extra.displayName || user.displayName || user.email?.split('@')[0] || 'New user',
    email: user.email ?? null,
    phone: user.phoneNumber ?? null,
    photoURL: user.photoURL ?? null,
    bio: '',
    createdAt: Date.now(),
    ...extra,
  }
  await setDoc(ref, profile)
}

export const subscribeProfile = (uid: string, cb: (p: UserProfile | null) => void) =>
  onSnapshot(doc(db, 'users', uid), (s) => cb(s.exists() ? (s.data() as UserProfile) : null))

export const subscribeUsers = (cb: (users: UserProfile[]) => void) =>
  onSnapshot(collection(db, 'users'), (s) => cb(s.docs.map((d) => d.data() as UserProfile)))

export const updateProfile = (uid: string, patch: Partial<UserProfile>) =>
  updateDoc(doc(db, 'users', uid), patch)

/* ---------------- conversations ---------------- */

/** Creates the five default groups when missing and makes the person a member of each. */
export async function joinDefaultGroups(uid: string) {
  await Promise.all(
    DEFAULT_GROUPS.map(async (g) => {
      const ref = doc(db, 'conversations', g.id)
      const snap = await getDoc(ref)
      if (!snap.exists()) {
        await setDoc(ref, {
          type: 'group', name: g.name, description: g.description, color: g.color, icon: g.icon,
          isPublic: true, members: [uid], admins: [uid], updatedAt: Date.now(),
        })
      } else if (!(snap.data().members as string[]).includes(uid)) {
        await updateDoc(ref, { members: arrayUnion(uid) })
      }
    }),
  )
}

export async function openDm(me: string, other: string) {
  const id = dmId(me, other)
  const ref = doc(db, 'conversations', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, { type: 'dm', members: [me, other].sort(), admins: [], updatedAt: Date.now() })
  }
  return id
}

export const subscribeConversations = (uid: string, cb: (c: Conversation[]) => void) =>
  onSnapshot(query(collection(db, 'conversations'), where('members', 'array-contains', uid)), (s) =>
    cb(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Conversation, 'id'>) }))),
  )

export const addMembers = (cid: string, uids: string[]) =>
  updateDoc(doc(db, 'conversations', cid), { members: arrayUnion(...uids) })

export async function leaveGroup(cid: string, uid: string) {
  const ref = doc(db, 'conversations', cid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const c = snap.data() as Conversation
  await updateDoc(ref, {
    members: c.members.filter((m) => m !== uid),
    admins: (c.admins ?? []).filter((m) => m !== uid),
  })
}

/* ---------------- messages ---------------- */

const messagesCol = (cid: string) => collection(db, 'conversations', cid, 'messages')

export async function fetchMessages(cid: string, count = 50, before?: number): Promise<Message[]> {
  const q = before
    ? query(messagesCol(cid), where('createdAt', '<', before), orderBy('createdAt', 'desc'), limit(count))
    : query(messagesCol(cid), orderBy('createdAt', 'desc'), limit(count))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, cid, ...(d.data() as Omit<Message, 'id' | 'cid'>) })).reverse()
}

export const previewText = (d: Pick<MessageDraft, 'text' | 'attachment'>) =>
  d.text.trim() || (d.attachment ? (d.attachment.kind === 'image' ? '📷 Photo' : `📎 ${d.attachment.name}`) : '')

export async function writeMessage(draft: MessageDraft): Promise<Message> {
  const createdAt = Date.now()
  const msgRef = doc(messagesCol(draft.cid))
  const { cid, ...body } = draft
  const batch = writeBatch(db)
  batch.set(msgRef, { ...body, createdAt })
  batch.update(doc(db, 'conversations', cid), {
    lastMessage: { text: previewText(draft).slice(0, 140), senderId: draft.senderId, senderName: draft.senderName, at: createdAt },
    updatedAt: createdAt,
  })
  await batch.commit()
  return { ...draft, id: msgRef.id, createdAt }
}

export function subscribeNewMessages(cid: string, since: number, cb: (m: Message) => void) {
  const q = query(messagesCol(cid), where('createdAt', '>', since), orderBy('createdAt'))
  return onSnapshot(q, (s) =>
    s.docChanges().forEach((ch) => {
      if (ch.type === 'added') cb({ id: ch.doc.id, cid, ...(ch.doc.data() as Omit<Message, 'id' | 'cid'>) })
    }),
  )
}

/** Joins the default groups once per account, so leaving a group sticks. */
export async function ensureDefaultGroupsOnce(uid: string) {
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  if (snap.exists() && snap.data().joinedDefaults) return
  await joinDefaultGroups(uid)
  await updateDoc(ref, { joinedDefaults: true })
}
