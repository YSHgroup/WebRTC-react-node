import type { ReactNode } from 'react'
import { Logo } from '@/components/ui/Logo'

export function AuthShell({ title, subtitle, children, footer }: {
  title: string; subtitle: string; children: ReactNode; footer?: ReactNode
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[420px] rounded-xl2 bg-panel p-7 shadow-card sm:p-9">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={44} />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-mute">{subtitle}</p>
        </div>
        {children}
        {footer && <p className="mt-6 text-center text-sm text-mute">{footer}</p>}
      </div>
    </main>
  )
}

export function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  )
}

export function Divider() {
  return (
    <div className="my-4 flex items-center gap-3 text-xs text-mute" role="separator">
      <span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" />
    </div>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{message}</p>
}
