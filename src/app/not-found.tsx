import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo size={52} />
      <h1 className="text-2xl font-bold">We can’t find that page</h1>
      <p className="max-w-sm text-sm text-mute">The link may be broken or the page may have moved.</p>
      <Link href="/" className="btn-primary">Back to Huddle</Link>
    </main>
  )
}
