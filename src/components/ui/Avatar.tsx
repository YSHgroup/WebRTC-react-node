import { Coffee, Code2, Hand, Handshake, Users, type LucideIcon } from 'lucide-react'
import { cn, colorFor, initials } from '@/lib/utils'

const ICONS: Record<string, LucideIcon> = { code: Code2, users: Users, hand: Hand, handshake: Handshake, coffee: Coffee }

interface Props {
  name: string
  src?: string | null
  size?: number
  online?: boolean
  /** group avatar: coloured rounded square with an icon */
  group?: { color?: string; icon?: string }
  className?: string
}

export function Avatar({ name, src, size = 40, online, group, className }: Props) {
  const style = { width: size, height: size }
  const Icon = group ? ICONS[group.icon ?? 'users'] ?? Users : null

  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={style}>
      {group ? (
        <span
          className="flex h-full w-full items-center justify-center rounded-[28%] text-white"
          style={{ background: group.color ?? colorFor(name) }}
          aria-hidden
        >
          {Icon && <Icon size={size * 0.46} strokeWidth={2.2} />}
        </span>
      ) : src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full font-semibold text-white"
          style={{ background: colorFor(name), fontSize: size * 0.38 }}
          aria-hidden
        >
          {initials(name)}
        </span>
      )}
      {online !== undefined && !group && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-panel',
            online ? 'bg-online' : 'bg-mute/50',
          )}
          style={{ width: Math.max(10, size * 0.27), height: Math.max(10, size * 0.27) }}
          title={online ? 'Online' : 'Offline'}
        />
      )}
    </span>
  )
}
