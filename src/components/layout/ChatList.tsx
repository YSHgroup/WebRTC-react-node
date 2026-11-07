'use client'
import { Check, ChevronDown, SquarePen } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { NewChatModal } from '@/components/chat/NewChatModal'
import { Avatar } from '@/components/ui/Avatar'
import { useMe } from '@/hooks/useMe'
import { cn, formatListTime } from '@/lib/utils'
import { conversationMeta, useChat } from '@/store/chat'
import { GlobalSearch } from './GlobalSearch'

const FILTERS = [
  { id: 'all', label: 'All chats' },
  { id: 'dm', label: 'Direct messages' },
  { id: 'group', label: 'Groups' },
  { id: 'unread', label: 'Unread' },
] as const
type Filter = (typeof FILTERS)[number]['id']

export function ChatList({ className }: { className?: string }) {
  const pathname = usePathname()
  const { uid } = useMe()
  const conversations = useChat((s) => s.conversations)
  const ready = useChat((s) => s.ready)
  const users = useChat((s) => s.users)
  const presence = useChat((s) => s.presence)
  const unread = useChat((s) => s.unread)
  const [filter, setFilter] = useState<Filter>('all')
  const [menu, setMenu] = useState(false)
  const [composing, setComposing] = useState(false)

  const rows = useMemo(
    () =>
      conversations
        .filter((c) => c.type === 'group' || c.lastMessage) // hide empty DMs until the first message
        .filter((c) => (filter === 'dm' ? c.type === 'dm' : filter === 'group' ? c.type === 'group' : filter === 'unread' ? (unread[c.id] ?? 0) > 0 : true))
        .sort((a, b) => (b.lastMessage?.at ?? b.updatedAt) - (a.lastMessage?.at ?? a.updatedAt)),
    [conversations, filter, unread],
  )

  return (
    <section aria-label="Conversations" className={cn('w-full shrink-0 flex-col border-r border-line lg:w-[340px]', className)}>
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <div className="relative">
          <button onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} className="flex items-center gap-1.5 text-lg font-bold">
            {FILTERS.find((f) => f.id === filter)!.label} <ChevronDown size={18} className="text-mute" />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
              <ul role="menu" className="pop-in absolute left-0 top-full z-30 mt-2 w-48 rounded-2xl border border-line bg-panel p-1.5 shadow-pop">
                {FILTERS.map((f) => (
                  <li key={f.id}>
                    <button role="menuitemradio" aria-checked={filter === f.id} onClick={() => { setFilter(f.id); setMenu(false) }} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-sunken">
                      {f.label}{filter === f.id && <Check size={15} className="text-brand-600" />}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <button onClick={() => setComposing(true)} aria-label="New message" title="New message" className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md transition hover:bg-brand-700">
          <SquarePen size={18} />
        </button>
      </div>

      <GlobalSearch className="px-5 pb-3 xl:hidden" />

      <ul className="scroll-thin flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        {!ready && Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex animate-pulse items-center gap-3 p-3"><span className="h-12 w-12 rounded-full bg-sunken" /><span className="flex-1 space-y-2"><span className="block h-3 w-1/2 rounded bg-sunken" /><span className="block h-3 w-3/4 rounded bg-sunken" /></span></li>
        ))}
        {ready && rows.length === 0 && (
          <li className="px-4 py-12 text-center text-sm text-mute">
            {filter === 'unread' ? 'You’re all caught up.' : 'No conversations yet. Start one with the pencil button.'}
          </li>
        )}
        {rows.map((c) => {
          const meta = conversationMeta(c, users, uid)
          const active = pathname === `/chat/${c.id}`
          const n = unread[c.id] ?? 0
          const lm = c.lastMessage
          const preview = lm ? `${lm.senderId === uid ? 'You' : c.type === 'group' ? lm.senderName.split(' ')[0] : ''}${lm.senderId === uid || c.type === 'group' ? ': ' : ''}${lm.text}` : c.type === 'group' ? 'No messages yet' : ''
          return (
            <li key={c.id}>
              <Link
                href={`/chat/${c.id}`}
                aria-current={active ? 'page' : undefined}
                className={cn('flex items-center gap-3 rounded-2xl p-3 transition', active ? 'bg-brand-50' : 'hover:bg-sunken')}
              >
                <Avatar name={meta.title} src={meta.other?.photoURL} size={48} online={c.type === 'dm' ? !!presence[meta.other?.uid ?? ''] : undefined} group={c.type === 'group' ? { color: c.color, icon: c.icon } : undefined} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={cn('truncate text-sm', n ? 'font-bold' : 'font-semibold')}>{meta.title}</span>
                    {lm && <span className="shrink-0 text-[11px] text-mute">{formatListTime(lm.at)}</span>}
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span className={cn('truncate text-[13px]', n ? 'font-medium text-ink' : 'text-mute')}>{preview}</span>
                    {n > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">{n > 99 ? '99+' : n}</span>}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      <NewChatModal open={composing} onClose={() => setComposing(false)} />
    </section>
  )
}
