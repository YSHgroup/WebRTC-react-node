'use client'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { useMe } from '@/hooks/useMe'
import { openDm } from '@/lib/chat/data'
import { useChat } from '@/store/chat'

export function NewChatModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
  }, [users, uid, q])

  return (
    <Modal open={open} onClose={onClose} title="New message">
      <input className="field mb-3" placeholder="Search by name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search people" autoFocus />
      <ul className="space-y-0.5">
        {list.map((u) => (
          <li key={u.uid}>
            <button
              onClick={async () => { const id = await openDm(uid, u.uid); onClose(); router.push(`/chat/${id}`) }}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-sunken"
            >
              <Avatar name={u.displayName} src={u.photoURL} size={38} online={!!presence[u.uid]} />
              <span className="min-w-0"><span className="block truncate text-sm font-medium">{u.displayName}</span><span className="block truncate text-xs text-mute">{u.email ?? u.phone}</span></span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="py-8 text-center text-sm text-mute">No one found. People appear here after they create an account.</li>}
      </ul>
    </Modal>
  )
}
