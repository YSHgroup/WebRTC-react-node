'use client'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { useMe } from '@/hooks/useMe'
import { getTransport } from '@/lib/realtime'
import type { Message } from '@/lib/types'
import { conversationMeta, useChat } from '@/store/chat'

export function ForwardModal({ message, onClose }: { message: Message | null; onClose: () => void }) {
  const { uid, name } = useMe()
  const conversations = useChat((s) => s.conversations)
  const users = useChat((s) => s.users)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return conversations
      .map((c) => ({ c, meta: conversationMeta(c, users, uid) }))
      .filter(({ meta }) => !t || meta.title.toLowerCase().includes(t))
      .sort((a, b) => (b.c.updatedAt ?? 0) - (a.c.updatedAt ?? 0))
  }, [conversations, users, uid, q])

  const forward = async (cid: string, title: string) => {
    if (!message) return
    setBusy(cid)
    try {
      await getTransport().sendMessage({
        cid, senderId: uid, senderName: name,
        text: message.text,
        attachment: message.attachment,
        forwardedFrom: message.forwardedFrom ?? message.senderName,
      })
      toast.success(`Forwarded to ${title}`)
      onClose()
    } catch (e) { toast.error((e as Error).message) } finally { setBusy(null) }
  }

  return (
    <Modal open={!!message} onClose={onClose} title="Forward to…">
      {message && (
        <p className="mb-3 line-clamp-2 rounded-xl bg-sunken px-3 py-2 text-sm text-mute">{message.text || message.attachment?.name}</p>
      )}
      <input className="field mb-3" placeholder="Search chats" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search chats" />
      <ul className="space-y-0.5">
        {list.map(({ c, meta }) => (
          <li key={c.id}>
            <button disabled={!!busy} onClick={() => forward(c.id, meta.title)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-sunken disabled:opacity-60">
              <Avatar name={meta.title} src={meta.other?.photoURL} size={38} group={c.type === 'group' ? { color: c.color, icon: c.icon } : undefined} />
              <span className="flex-1 truncate text-sm font-medium">{meta.title}</span>
              <span className="text-xs font-semibold text-brand-600">{busy === c.id ? 'Sending…' : 'Send'}</span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="py-6 text-center text-sm text-mute">No chats match.</li>}
      </ul>
    </Modal>
  )
}
