import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to Huddle with your email, phone number or Google account.',
  alternates: { canonical: '/login' },
}
export default function Layout({ children }: { children: React.ReactNode }) { return children }
