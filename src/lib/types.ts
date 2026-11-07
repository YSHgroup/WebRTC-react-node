export interface UserProfile {
  uid: string
  displayName: string
  email: string | null
  phone: string | null
  photoURL: string | null
  bio: string
  online?: boolean
  joinedDefaults?: boolean
  lastSeen?: number
  createdAt: number
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
}

export interface Attachment {
  kind: 'image' | 'file'
  name: string
  size: number
  mime: string
  /** data URL — Firebase Storage is no longer free, so small files live in Firestore */
  dataUrl: string
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

export type MessageDraft = Omit<Message, 'id' | 'createdAt'>

export const DEFAULT_GROUPS: { id: string; name: string; description: string; color: string; icon: string }[] = [
  { id: 'development', name: 'Development', description: 'Official group for all development team members and updates.', color: '#7C5CFF', icon: 'code' },
  { id: 'hr', name: 'HR Team', description: 'Human Resources team discussions and important updates.', color: '#64748B', icon: 'users' },
  { id: 'introduction', name: 'Introduction', description: 'Say hello and tell the team a little about yourself.', color: '#F59E0B', icon: 'hand' },
  { id: 'partners', name: 'Partners', description: 'Shared space with our partners.', color: '#0EA5E9', icon: 'handshake' },
  { id: 'topic-off', name: 'Topic-off', description: 'Anything goes — off-topic chat.', color: '#EC4899', icon: 'coffee' },
]
export const DEFAULT_GROUP_IDS = DEFAULT_GROUPS.map((g) => g.id)

export const dmId = (a: string, b: string) => [a, b].sort().join('_')
