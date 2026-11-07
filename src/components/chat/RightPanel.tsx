'use client'
import { Bell, ChevronRight, Download, FileText, LogOut, MessageSquare, Phone, UserPlus, Video, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { useMe } from '@/hooks/useMe'
import { addMembers, leaveGroup } from '@/lib/chat/data'
import { presenceLabel } from '@/lib/chat/helpers'
import type { Conversation, Message, UserProfile } from '@/lib/types'
import { cn, formatBytes } from '@/lib/utils'
import { useChat } from '@/store/chat'

interface Props {
  conversation: Conversation
  messages: Message[]
  onCall: (video: boolean) => void
  onClose: () => void
}

function MediaAndFiles({ messages }: { messages: Message[] }) {
  const [all, setAll] = useState(false)
  const images = messages.filter((m) => m.attachment?.kind === 'image').reverse()
  const files = messages.filter((m) => m.attachment?.kind === 'file').reverse()
  const shownImages = all ? images : images.slice(0, 4)
  return (
    <>
      <section className="border-t border-line px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Shared media</h3>
          {images.length > 4 && <button onClick={() => setAll((v) => !v)} className="text-xs font-medium text-brand-600">{all ? 'Show less' : 'View all'}</button>}
        </div>
        {images.length === 0 ? <p className="text-sm text-mute">Photos you share will appear here.</p> : (
          <div className="grid grid-cols-4 gap-1.5">
            {shownImages.map((m) => (
              <a key={m.id} href={m.attachment!.dataUrl} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-xl bg-sunken">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.attachment!.dataUrl} alt={m.attachment!.name} className="h-full w-full object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        )}
      </section>
      <section className="border-t border-line px-5 py-4">
        <h3 className="mb-3 text-sm font-semibold">Files</h3>
        {files.length === 0 ? <p className="text-sm text-mute">Shared files will appear here.</p> : (
          <ul className="space-y-2">
            {files.slice(0, 5).map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500"><FileText size={17} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{m.attachment!.name}</span><span className="block text-xs text-mute">{formatBytes(m.attachment!.size)}</span></span>
                <a href={m.attachment!.dataUrl} download={m.attachment!.name} aria-label={`Download ${m.attachment!.name}`} className="rounded-lg p-2 text-mute hover:bg-sunken hover:text-brand-600"><Download size={16} /></a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function ContactPanel({ user, online, messages, onCall }: { user: UserProfile | null; online: boolean; messages: Message[]; onCall: Props['onCall'] }) {
  if (!user) return <p className="p-6 text-sm text-mute">This person’s profile isn’t available.</p>
  const actions = [
    { icon: MessageSquare, label: 'Message', on: () => document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message"]')?.focus() },
    { icon: Phone, label: 'Call', on: () => onCall(false) },
    { icon: Video, label: 'Video', on: () => onCall(true) },
  ]
  return (
    <>
      <div className="h-28 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700" aria-hidden />
      <div className="-mt-12 flex flex-col items-center px-5">
        <span className="rounded-full border-4 border-panel"><Avatar name={user.displayName} src={user.photoURL} size={88} online={online} /></span>
        <h2 className="mt-3 text-lg font-bold">{user.displayName}</h2>
        <p className={cn('text-sm', online ? 'text-online' : 'text-mute')}>{presenceLabel(online, user)}</p>
        <div className="mt-4 flex w-full justify-center gap-6">
          {actions.map(({ icon: Icon, label, on }) => (
            <button key={label} onClick={on} className="flex flex-col items-center gap-1.5 text-xs font-medium text-mute hover:text-brand-600">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Icon size={18} /></span>{label}
            </button>
          ))}
        </div>
      </div>
      <section className="mt-5 space-y-3 border-t border-line px-5 py-4">
        <h3 className="text-sm font-semibold">About</h3>
        <dl className="space-y-3 text-sm">
          {user.email && <div><dt className="text-xs font-semibold">Email</dt><dd className="break-all text-mute">{user.email}</dd></div>}
          {user.phone && <div><dt className="text-xs font-semibold">Phone</dt><dd className="text-mute">{user.phone}</dd></div>}
          <div><dt className="text-xs font-semibold">Bio</dt><dd className="text-mute">{user.bio || 'No bio yet.'}</dd></div>
        </dl>
      </section>
      <MediaAndFiles messages={messages} />
    </>
  )
}

function GroupPanel({ conversation, messages }: { conversation: Conversation; messages: Message[] }) {
  const router = useRouter()
  const { uid } = useMe()
  const users = useChat((s) => s.users)
  const presence = useChat((s) => s.presence)
  const [adding, setAdding] = useState(false)
  const [notify, setNotify] = useState(true)
  const isAdmin = conversation.admins?.includes(uid)

  const links = messages.reduce((n, m) => n + (m.text.match(/https?:\/\/\S+/g)?.length ?? 0), 0)
  const candidates = useMemo(() => Object.values(users).filter((u) => !conversation.members.includes(u.uid)), [users, conversation.members])

  return (
    <>
      <div className="flex flex-col items-center px-5 pt-8">
        <Avatar name={conversation.name ?? 'Group'} size={84} group={{ color: conversation.color, icon: conversation.icon }} />
        <h2 className="mt-3 text-lg font-bold">{conversation.name}</h2>
        <p className="text-sm text-mute">{conversation.members.length} members</p>
      </div>
      {conversation.description && (
        <section className="mx-5 mt-4 rounded-xl border border-line p-3">
          <h3 className="text-xs font-semibold text-mute">Description</h3>
          <p className="mt-1 text-sm">{conversation.description}</p>
        </section>
      )}

      <section className="mt-4 px-5">
        <h3 className="mb-2 text-sm font-semibold">Members</h3>
        <ul className="space-y-1">
          {conversation.members.map((id) => {
            const u = users[id]
            return (
              <li key={id} className="flex items-center gap-3 rounded-xl p-1.5">
                <Avatar name={u?.displayName ?? '?'} src={u?.photoURL} size={34} online={!!presence[id]} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{u?.displayName ?? 'Unknown'}{id === uid && ' (you)'}</span>
                <span className={cn('text-xs', conversation.admins?.includes(id) ? 'font-semibold text-brand-600' : 'text-mute')}>{conversation.admins?.includes(id) ? 'Admin' : 'Member'}</span>
              </li>
            )
          })}
        </ul>
        {isAdmin && (
          <button onClick={() => setAdding(true)} className="btn-primary mt-3 w-full"><UserPlus size={16} /> Add members</button>
        )}
      </section>

      <section className="mt-4 border-t border-line">
        <div className="flex items-center justify-between px-5 py-3.5 text-sm">
          <span className="flex items-center gap-2"><Bell size={16} className="text-mute" /> Notifications</span>
          <button role="switch" aria-checked={notify} aria-label="Notifications" onClick={() => setNotify((v) => !v)} className={cn('relative h-6 w-11 rounded-full transition', notify ? 'bg-brand-600' : 'bg-line')}>
            <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', notify ? 'left-[22px]' : 'left-0.5')} />
          </button>
        </div>
        {[['Shared media', messages.filter((m) => m.attachment?.kind === 'image').length], ['Files', messages.filter((m) => m.attachment?.kind === 'file').length], ['Links', links]].map(([label, n]) => (
          <div key={label as string} className="flex items-center justify-between border-t border-line px-5 py-3.5 text-sm">
            <span>{label}</span><span className="flex items-center gap-1 text-mute">{n}<ChevronRight size={15} /></span>
          </div>
        ))}
      </section>
      <MediaAndFiles messages={messages} />

      <div className="border-t border-line px-5 py-4">
        <button
          onClick={async () => { if (confirm(`Leave ${conversation.name}?`)) { await leaveGroup(conversation.id, uid); router.replace('/chat') } }}
          className="flex items-center gap-2 text-sm font-semibold text-red-500"
        ><LogOut size={16} /> Leave group</button>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add members">
        <ul className="space-y-0.5">
          {candidates.map((u) => (
            <li key={u.uid}>
              <button
                onClick={async () => { await addMembers(conversation.id, [u.uid]); toast.success(`${u.displayName} added`) }}
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-sunken"
              >
                <Avatar name={u.displayName} src={u.photoURL} size={36} />
                <span className="flex-1 truncate text-sm font-medium">{u.displayName}</span>
                <span className="text-xs font-semibold text-brand-600">Add</span>
              </button>
            </li>
          ))}
          {candidates.length === 0 && <li className="py-6 text-center text-sm text-mute">Everyone is already in this group.</li>}
        </ul>
      </Modal>
    </>
  )
}

export function RightPanel({ conversation, messages, onCall, onClose }: Props) {
  const { uid } = useMe()
  const users = useChat((s) => s.users)
  const presence = useChat((s) => s.presence)
  const otherId = conversation.members.find((m) => m !== uid)
  return (
    <div className="relative flex h-full flex-col bg-panel">
      <button onClick={onClose} aria-label="Close panel" className="absolute right-3 top-3 z-10 rounded-full bg-black/20 p-1.5 text-white backdrop-blur hover:bg-black/30 2xl:hidden"><X size={16} /></button>
      <div className="scroll-thin flex-1 overflow-y-auto pb-6">
        {conversation.type === 'dm'
          ? <ContactPanel user={otherId ? users[otherId] ?? null : null} online={!!(otherId && presence[otherId])} messages={messages} onCall={onCall} />
          : <GroupPanel conversation={conversation} messages={messages} />}
      </div>
    </div>
  )
}
