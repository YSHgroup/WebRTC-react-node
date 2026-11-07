import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster } from 'sonner'
import { AuthListener } from '@/components/layout/AuthListener'
import { ThemeScript } from '@/components/layout/ThemeScript'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' })

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'Huddle — private chats, team groups and free video calls', template: '%s · Huddle' },
  description:
    'Huddle is a free team messenger: private and group chat with formatting, replies and forwarding, plus peer-to-peer video calls that run right in your browser.',
  applicationName: 'Huddle',
  keywords: ['team chat', 'group chat', 'video call', 'WebRTC', 'messenger', 'free chat app'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website', siteName: 'Huddle', url: '/', locale: 'en_US',
    title: 'Huddle — private chats, team groups and free video calls',
    description: 'Chat with your team, jump on a video call, and keep everything in one calm place.',
  },
  twitter: { card: 'summary_large_image', title: 'Huddle', description: 'Free team chat with built-in video calls.' },
  robots: { index: true, follow: true },
  icons: { icon: '/icon.svg' },
}

export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#EEECFA' }, { media: '(prefers-color-scheme: dark)', color: '#0E0C1B' }],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable} suppressHydrationWarning>
      <head><ThemeScript /></head>
      <body>
        <AuthListener />
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  )
}
