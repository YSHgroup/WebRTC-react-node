import type { Metadata } from 'next'
import { WorkspaceShell } from '@/components/layout/WorkspaceShell'

// The signed-in app is private: keep it out of search results.
export const metadata: Metadata = { title: 'Chats', robots: { index: false, follow: false } }

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>
}
