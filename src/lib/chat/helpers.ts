import type { UserProfile } from '@/lib/types'

export function presenceLabel(online: boolean, user?: Pick<UserProfile, 'lastSeen'> | null) {
  if (online) return 'Online'
  const t = user?.lastSeen
  if (!t) return 'Offline'
  const mins = Math.floor((Date.now() - t) / 60000)
  if (mins < 1) return 'Last seen just now'
  if (mins < 60) return `Last seen ${mins}m ago`
  if (mins < 60 * 24) return `Last seen ${Math.floor(mins / 60)}h ago`
  return `Last seen ${new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
}
