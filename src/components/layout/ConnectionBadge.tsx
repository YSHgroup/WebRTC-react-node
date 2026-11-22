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
      aria-label={`Realtime ${label.toLowerCase()}. ${message}`}
      className={`group relative flex cursor-help items-center justify-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
        live ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
      } ${mobile ? 'min-h-[52px] flex-1 flex-col gap-0.5' : ''}`}
    >
      <Icon size={16} aria-hidden />
      <span>{label}</span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-center text-xs font-normal leading-relaxed text-white opacity-0 shadow-pop transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {message}
      </span>
    </span>
  )
}
