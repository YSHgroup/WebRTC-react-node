export interface UserProfile {
  uid: string
  displayName: string
  email: string | null
  phone: string | null
  photoURL: string | null
  bio: string
  createdAt: number
  /** filled in from realtime presence */
  lastSeen?: number
}

/** The signed-in person, as returned by the server. */
export interface Me extends UserProfile {
  emailVerified: boolean
  phoneVerified: boolean
  hasPassword: boolean
  hasGoogle: boolean
  needsVerification: boolean
}

export type ConversationType = 'dm' | 'group'

export interface LastMessage {
  text: string
  senderId: string
  senderName: string
  at: number
}

export interface Conversation {
  id: string
  type: ConversationType
  members: string[]
  admins: string[]
  name?: string
  description?: string
  color?: string
  icon?: string
  isPublic?: boolean
  lastMessage?: LastMessage
  updatedAt: number
  /** unread count from the server (persisted across devices) */
  unread?: number
}

/** A file already stored on the server. */
export interface Attachment {
  id: string
  kind: 'image' | 'file'
  name: string
  size: number
  mime: string
  /** same-origin URL, protected by the session cookie */
  url: string
}

/** A file picked in the composer but not uploaded yet. */
export interface PendingAttachment {
  file: Blob
  kind: 'image' | 'file'
  name: string
  size: number
  mime: string
  previewUrl: string | null
}

export interface ReplyRef {
  id: string
  senderName: string
  text: string
}

export interface Message {
  id: string
  cid: string
  senderId: string
  senderName: string
  text: string
  createdAt: number
  replyTo?: ReplyRef
  forwardedFrom?: string
  attachment?: Attachment
}

export interface MessageDraft {
  cid: string
  text: string
  replyToId?: string
  forwardedFrom?: string
  attachmentId?: string
}

export const dmId = (a: string, b: string) => [a, b].sort().join('_')
