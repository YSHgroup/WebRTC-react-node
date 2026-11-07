import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Create your account',
  description: 'Create a free Huddle account with your email, phone number or Google account and start chatting in minutes.',
  alternates: { canonical: '/register' },
}
export default function Layout({ children }: { children: React.ReactNode }) { return children }
