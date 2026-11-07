'use client'
import { MessageSquare, Phone, Video } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/Avatar'
import { IconButton } from '@/components/ui/IconButton'
import { useMe } from '@/hooks/useMe'
import { openDm } from '@/lib/chat/data'
import { presenceLabel } from '@/lib/chat/helpers'
import { startCall } from '@/lib/webrtc/callManager'
import { useChat } from '@/store/chat'

export default function ContactsPage() {
  const router = useRouter()
  const { uid } = useMe()
  const users = useChat((s) => s.users)
  const presence = useChat((s) => s.presence)
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return Object.values(users)
      .filter((u) => u.uid !== uid)
      .filter((u) => !t || [u.displayName, u.email, u.phone].some((f) => f?.toLowerCase().includes(t)))
      .sort((a, b) => Number(!!presence[b.uid]) - Number(!!presence[a.uid]) || a.displayName.localeCompare(b.displayName))
  }, [users, presence, uid, q])

  const call = async (id: string, video: boolean) => {
    try { const c = await startCall(id, video); if (c) router.push(`/call/${c}`) } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="border-b border-line px-5 py-5"><h1 className="text-xl font-bold">Contacts</h1></header>
      <div className="p-4 sm:px-6"><input className="field" placeholder="Search contacts" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search contacts" /></div>
      <ul className="scroll-thin flex-1 space-y-1 overflow-y-auto px-3 pb-4 sm:px-5">
        {list.map((u) => (
          <li key={u.uid} className="flex items-center gap-3 rounded-2xl p-2.5 hover:bg-sunken">
            <Avatar name={u.displayName} src={u.photoURL} size={46} online={!!presence[u.uid]} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{u.displayName}</span>
              <span className="block truncate text-xs text-mute">{presenceLabel(!!presence[u.uid], u)}</span>
            </span>
            <IconButton label={`Message ${u.displayName}`} onClick={async () => router.push(`/chat/${await openDm(uid, u.uid)}`)}><MessageSquare size={18} /></IconButton>
            <IconButton label={`Call ${u.displayName}`} onClick={() => call(u.uid, false)}><Phone size={18} /></IconButton>
            <IconButton label={`Video call ${u.displayName}`} onClick={() => call(u.uid, true)}><Video size={18} /></IconButton>
          </li>
        ))}
        {list.length === 0 && <li className="py-16 text-center text-sm text-mute">{q ? `No contacts match “${q}”.` : 'No other people have joined yet. Share the sign-up link with a teammate.'}</li>}
      </ul>
    </div>
  )
}
