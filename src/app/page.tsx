import { Code2, Lock, MessageSquareText, Video } from 'lucide-react'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

const FEATURES = [
  { icon: MessageSquareText, title: 'Chat that keeps up', body: 'Private messages and team groups with formatting, emoji, replies and forwarding.' },
  { icon: Video, title: 'Video calls in one click', body: 'Peer-to-peer WebRTC calls straight from any conversation. Nothing to install.' },
  { icon: Code2, title: 'Groups for every team', body: 'Development, HR, Introduction, Partners and Topic-off are ready when you sign up.' },
  { icon: Lock, title: 'Your sign-in, your way', body: 'Email with a verification code, phone via SMS, or Google. Protected by reCAPTCHA.' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Huddle',
  applicationCategory: 'CommunicationApplication',
  operatingSystem: 'Any (web browser)',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  description: 'Free team messenger with private chat, group chat and peer-to-peer video calls.',
}

export default function Landing() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-bold"><Logo size={32} /> Huddle</Link>
        <nav aria-label="Account" className="flex items-center gap-2">
          <Link href="/login" className="rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-panel">Sign in</Link>
          <Link href="/register" className="btn-primary !py-2.5">Create account</Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">
              Talk to your team the moment you need to.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-mute">
              Huddle puts private chats, team groups and video calls in one calm, fast workspace. Free to use and runs in your browser.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary px-6">Start chatting</Link>
              <Link href="/login" className="btn-ghost px-6">I already have an account</Link>
            </div>
          </div>

          {/* A real-looking slice of the product instead of a stock illustration */}
          <div aria-hidden className="relative rounded-xl2 bg-panel p-4 shadow-card">
            <div className="flex items-center gap-3 border-b border-line pb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">AJ</span>
              <div><p className="text-sm font-semibold">Alice Johnson</p><p className="text-xs text-online">Online</p></div>
            </div>
            <div className="space-y-3 py-4 text-sm">
              <p className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-white">Hey Alice! Are we still on for the meeting tomorrow?</p>
              <p className="w-fit max-w-[80%] rounded-2xl rounded-bl-md bg-bubble px-4 py-2.5">Yes, absolutely! See you at 10 AM.</p>
              <p className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-white">Starting a call now so we can walk through the proposal.</p>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-brand-50 px-4 py-3">
              <span className="text-sm font-medium text-brand-700">Video call · 00:24</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white"><Video size={16} /></span>
            </div>
          </div>
        </section>

        <section aria-labelledby="features" className="mx-auto max-w-6xl px-5 pb-24">
          <h2 id="features" className="text-2xl font-bold tracking-tight sm:text-3xl">Everything a small team needs, nothing it doesn’t</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4 rounded-xl2 bg-panel p-6 shadow-card">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon size={20} /></span>
                <div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-mute">{body}</p></div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-line py-8 text-center text-sm text-mute">© {new Date().getFullYear()} Huddle</footer>
    </>
  )
}
