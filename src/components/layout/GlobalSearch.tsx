'use client'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { useMe } from '@/hooks/useMe'
import { openDm } from '@/lib/chat/data'
import { cn } from '@/lib/utils'
import { useChat } from '@/store/chat'

export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter()
  const { uid } = useMe()
  const users = useChat((s) => s.users)
  const conversations = useChat((s) => s.conversations)
  const presence = useChat((s) => s.presence)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.current?.focus() }
    }
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [])

  const term = q.trim().toLowerCase()
  const results = useMemo(() => {
    if (!term) return { people: [], groups: [] }
    const people = Object.values(users)
      .filter((u) => u.uid !== uid)
      .filter((u) => [u.displayName, u.email, u.phone].some((f) => f?.toLowerCase().includes(term)))
      .slice(0, 6)
    const groups = conversations.filter((c) => c.type === 'group' && c.name?.toLowerCase().includes(term)).slice(0, 5)
    return { people, groups }
  }, [term, users, conversations, uid])

  const go = (href: string) => { setOpen(false); setQ(''); router.push(href) }
  const empty = term && !results.people.length && !results.groups.length

  return (
    <div ref={box} className={cn('relative', className)}>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
        <input
          ref={input}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search users or groups…"
          aria-label="Search users or groups"
          className="field rounded-full py-2.5 pl-10 pr-14"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-line bg-panel px-1.5 py-0.5 text-[10px] text-mute">⌘ K</kbd>
      </div>

      {open && term && (
        <div className="pop-in absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-line bg-panel p-2 shadow-pop scroll-thin">
          {results.people.length > 0 && <p className="px-2 pb-1 pt-1 text-xs font-semibold text-mute">Users</p>}
          {results.people.map((u) => (
            <button key={u.uid} onClick={async () => go(`/chat/${await openDm(uid, u.uid)}`)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-sunken">
              <Avatar name={u.displayName} src={u.photoURL} size={34} online={!!presence[u.uid]} />
              <span className="min-w-0"><span className="block truncate text-sm font-medium">{u.displayName}</span><span className="block truncate text-xs text-mute">{u.email ?? u.phone}</span></span>
            </button>
          ))}
          {results.groups.length > 0 && <p className="px-2 pb-1 pt-2 text-xs font-semibold text-mute">Groups</p>}
          {results.groups.map((g) => (
            <button key={g.id} onClick={() => go(`/chat/${g.id}`)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-sunken">
              <Avatar name={g.name ?? 'Group'} size={34} group={{ color: g.color, icon: g.icon }} />
              <span className="min-w-0"><span className="block truncate text-sm font-medium">{g.name}</span><span className="block text-xs text-mute">{g.members.length} members</span></span>
            </button>
          ))}
          {empty && <p className="px-3 py-6 text-center text-sm text-mute">No users or groups match “{q}”.</p>}
        </div>
      )}
    </div>
  )
}
