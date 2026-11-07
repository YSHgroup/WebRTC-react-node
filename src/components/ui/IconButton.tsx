import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function IconButton({ label, children, className, active, ...rest }: {
  label: string; children: ReactNode; active?: boolean
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-xl text-mute transition hover:bg-brand-50 hover:text-brand-600 disabled:opacity-40',
        active && 'bg-brand-50 text-brand-600',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
