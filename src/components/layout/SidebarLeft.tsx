'use client'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { useMe } from '@/hooks/useMe'
import { openDm } from '@/lib/chat/data'
import { presenceLabel } from '@/lib/chat/helpers'
import { useChat } from '@/store/chat'
import { GlobalSearch } from './GlobalSearch'

export function SidebarLeft() {
  const router = useRouter()
  const me = useMe()
  const users = useChat((s) => s.users)
  const conversations = useChat((s) => s.conversations)
  const presence = useChat((s) => s.presence)
  const [all, setAll] = useState(false)

  const groups = useMemo(() => conversations.filter((c) => c.type === 'group').sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')), [conversations])
  const contacts = useMemo(
    () => Object.values(users).filter((u) => u.uid !== me.uid).sort((a, b) => Number(!!presence[b.uid]) - Number(!!presence[a.uid]) || a.displayName.localeCompare(b.displayName)),
    [users, presence, me.uid],
  )
  const shown = all ? contacts : contacts.slice(0, 5)

  return (
    <aside aria-label="People and groups" className="scroll-thin hidden w-[280px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-line bg-sunken/60 p-4 xl:flex">
      <Link href="/profile" className="flex items-center gap-3 rounded-2xl p-1 hover:bg-panel">
        <Avatar name={me.name} src={me.photo} size={52} online />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{me.name}</span>
          <span className="block truncate text-xs text-mute">{me.email ?? me.phone}</span>
          {me.email && me.phone && <span className="block truncate text-xs text-mute">{me.phone}</span>}
        </span>
      </Link>

      <GlobalSearch />

      <section aria-labelledby="groups-h">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="groups-h" className="text-sm font-semibold">Groups</h2>
          <span className="text-mute" aria-hidden><Plus size={16} /></span>
        </div>
        <ul className="space-y-0.5">
          {groups.map((g) => (
            <li key={g.id}>
              <Link href={`/chat/${g.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-panel">
                <Avatar name={g.name ?? 'Group'} size={36} group={{ color: g.color, icon: g.icon }} />
                <span className="min-w-0"><span className="block truncate text-sm font-medium">{g.name}</span><span className="block text-xs text-mute">{g.members.length} members</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="contacts-h">
        <h2 id="contacts-h" className="mb-2 text-sm font-semibold">Connected contacts</h2>
        <ul className="space-y-0.5">
          {shown.map((u) => (
            <li key={u.uid}>
              <button onClick={async () => router.push(`/chat/${await openDm(me.uid, u.uid)}`)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-panel">
                <Avatar name={u.displayName} src={u.photoURL} size={36} online={!!presence[u.uid]} />
                <span className="min-w-0"><span className="block truncate text-sm font-medium">{u.displayName}</span><span className="block truncate text-xs text-mute">{presenceLabel(!!presence[u.uid], u)}</span></span>
              </button>
            </li>
          ))}
          {contacts.length === 0 && <li className="px-2 py-3 text-sm text-mute">Invite a teammate to sign up and they’ll show up here.</li>}
        </ul>
        {contacts.length > 5 && (
          <button onClick={() => setAll((v) => !v)} className="mt-1 flex items-center gap-1 px-2 text-xs font-medium text-mute hover:text-ink">
            {all ? <>Show less <ChevronUp size={14} /></> : <>Show more <ChevronDown size={14} /></>}
          </button>
        )}
      </section>
    </aside>
  )
}
