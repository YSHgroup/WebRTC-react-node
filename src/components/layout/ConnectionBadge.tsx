'use client'

import { Wifi, WifiOff } from 'lucide-react'
import { useChat } from '@/store/chat'

export function ConnectionBadge({ mobile = false }: { mobile?: boolean }) {
  const live = useChat((s) => s.live)
  const liveError = useChat((s) => s.liveError)
  const Icon = live ? Wifi : WifiOff
  const label = live ? 'Calls ready' : 'Calls unavailable'
  const message = live
    ? 'Live updates and calls are available.'
    : `Live updates are off. Messages refresh periodically; calls are unavailable until realtime reconnects.${liveError ? ` ${liveError}` : ''}`

  return (
    <span
      tabIndex={0}
      role="status"
      title={message}
      aria-label={`Realtime ${label.toLowerCase()}. ${message}`}
      className={`flex cursor-help items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
        live ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
      } ${mobile ? 'min-h-[52px] flex-1' : 'h-11 w-11'}`}
    >
      <Icon size={18} aria-hidden />
    </span>
  )
}
