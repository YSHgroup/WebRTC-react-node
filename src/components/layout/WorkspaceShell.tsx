'use client'
import { usePathname } from 'next/navigation'
import { IncomingCall } from '@/components/call/IncomingCall'
import { Logo } from '@/components/ui/Logo'
import { useBoot } from '@/hooks/useBoot'
import { cn } from '@/lib/utils'
import { ChatList } from './ChatList'
import { BottomNav, Rail } from './Rail'
import { SidebarLeft } from './SidebarLeft'

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const status = useBoot()
  const pathname = usePathname()

  if (status !== 'ready') {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4" role="status" aria-live="polite">
        <span className="animate-pulse"><Logo size={56} /></span>
        <p className="text-sm text-mute">Loading your workspace…</p>
      </div>
    )
  }

  const onChatRoot = pathname === '/chat'
  const inConversation = /^\/chat\/[^/]+/.test(pathname)

  return (
    <div className="flex h-dvh flex-col bg-canvas lg:p-3">
      <div className="flex min-h-0 flex-1 overflow-hidden bg-panel lg:rounded-xl2 lg:shadow-card">
        <Rail />
        <SidebarLeft />
        <ChatList className={cn(onChatRoot ? 'flex' : 'hidden lg:flex')} />
        <main className={cn('min-w-0 flex-1', onChatRoot ? 'hidden lg:flex' : 'flex')}>
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </main>
      </div>
      {!inConversation && <BottomNav />}
      <IncomingCall />
    </div>
  )
}
