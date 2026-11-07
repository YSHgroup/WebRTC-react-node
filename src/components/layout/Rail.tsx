'use client'
import { LogOut, MessageCircle, Moon, Sun, User, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Logo } from '@/components/ui/Logo'
import { logout } from '@/lib/firebase/authActions'
import { cn } from '@/lib/utils'
import { useChat } from '@/store/chat'

export const NAV = [
  { href: '/chat', label: 'Chats', icon: MessageCircle },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/profile', label: 'Profile', icon: User },
]

export function useTotalUnread() {
  return useChat((s) => Object.values(s.unread).reduce((a, b) => a + b, 0))
}

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false)
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), [])
  return (
    <button
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => {
        const next = !dark
        document.documentElement.classList.toggle('dark', next)
        try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch {}
        setDark(next)
      }}
      className={cn('flex h-11 w-11 items-center justify-center rounded-full text-mute transition hover:bg-brand-50 hover:text-brand-600', className)}
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}

export function Rail() {
  const pathname = usePathname()
  const unread = useTotalUnread()
  return (
    <nav aria-label="Main" className="hidden w-[76px] shrink-0 flex-col items-center gap-2 border-r border-line py-5 md:flex">
      <Link href="/chat" aria-label="Huddle home" className="mb-4"><Logo size={36} /></Link>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            title={label}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex h-11 w-11 items-center justify-center rounded-full transition',
              active ? 'bg-brand-600 text-white shadow-md' : 'text-mute hover:bg-brand-50 hover:text-brand-600',
            )}
          >
            <Icon size={20} />
            {href === '/chat' && unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
        )
      })}
      <div className="mt-auto flex flex-col items-center gap-1">
        <ThemeToggle />
        <button
          aria-label="Sign out"
          title="Sign out"
          onClick={() => logout()}
          className="flex h-11 w-11 items-center justify-center rounded-full text-mute transition hover:bg-red-500/10 hover:text-red-500"
        >
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  )
}

export function BottomNav() {
  const pathname = usePathname()
  const unread = useTotalUnread()
  return (
    <nav aria-label="Main" className="pb-safe flex shrink-0 border-t border-line bg-panel md:hidden">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn('relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium', active ? 'text-brand-600' : 'text-mute')}
          >
            <Icon size={21} />
            {label}
            {href === '/chat' && unread > 0 && (
              <span className="absolute right-[32%] top-1.5 h-2.5 w-2.5 rounded-full bg-red-500" aria-label={`${unread} unread`} />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
