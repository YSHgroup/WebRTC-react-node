'use client'
import { useParams } from 'next/navigation'
import { ChatView } from '@/components/chat/ChatView'

export default function ConversationPage() {
  const { cid } = useParams<{ cid: string }>()
  return <ChatView key={cid} cid={cid} />
}
