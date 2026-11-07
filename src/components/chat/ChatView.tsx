'use client'
import { ArrowLeft, Info, Phone, Video } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/Avatar'
import { IconButton } from '@/components/ui/IconButton'
import { useConversation } from '@/hooks/useConversation'
import { useMe } from '@/hooks/useMe'
import { useMedia } from '@/hooks/useMedia'
import { presenceLabel } from '@/lib/chat/helpers'
import { getTransport } from '@/lib/realtime'
import type { Attachment, Message } from '@/lib/types'
import { cn } from '@/lib/utils'
import { startCall } from '@/lib/webrtc/callManager'
import { conversationMeta, useChat } from '@/store/chat'
import { Composer } from './Composer'
import { ForwardModal } from './ForwardModal'
import { MessageList } from './MessageList'
import { RightPanel } from './RightPanel'

export function ChatView({ cid }: { cid: string }) {
  const router = useRouter()
  const { uid, name } = useMe()
  const ready = useChat((s) => s.ready)
  const conversation = useChat((s) => s.conversations.find((c) => c.id === cid))
  const users = useChat((s) => s.users)
  const presence = useChat((s) => s.presence)
  const { messages, loading, hasMore, loadingMore, loadMore, typingUids } = useConversation(cid)

  const wide = useMedia('(min-width: 1536px)')
  const [panel, setPanel] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [forwarding, setForwarding] = useState<Message | null>(null)

  useEffect(() => { setReplyTo(null); setForwarding(null) }, [cid])
  const showPanel = wide || panel

  if (!ready) return <div className="flex flex-1 items-center justify-center text-sm text-mute">Loading…</div>
  if (!conversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-lg font-semibold">Conversation not found</h1>
        <p className="text-sm text-mute">It may have been removed, or you’re not a member.</p>
        <Link href="/chat" className="btn-primary">Back to chats</Link>
      </div>
    )
  }

  const meta = conversationMeta(conversation, users, uid)
  const isGroup = conversation.type === 'group'
  const otherOnline = !!(meta.other && presence[meta.other.uid])
  const typingNames = typingUids.map((id) => users[id]?.displayName?.split(' ')[0] ?? 'Someone')
  const status = typingNames.length
    ? 'typing…'
    : isGroup ? `${conversation.members.length} members` : presenceLabel(otherOnline, meta.other)

  const send = async (text: string, attachment?: Attachment) => {
    const msg = await getTransport().sendMessage({
      cid, senderId: uid, senderName: name, text,
      ...(attachment && { attachment }),
      ...(replyTo && { replyTo: { id: replyTo.id, senderName: replyTo.senderName, text: (replyTo.text || replyTo.attachment?.name || 'Attachment').slice(0, 200) } }),
    })
    useChat.getState().mergeMessages(cid, [msg])
    setReplyTo(null)
  }

  const call = async (video: boolean) => {
    if (!meta.other) return
    try {
      const id = await startCall(meta.other.uid, video)
      if (id) router.push(`/call/${id}`)
    } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line px-3 py-3 sm:px-5">
          <Link href="/chat" aria-label="Back to chats" className="rounded-xl p-2 text-mute hover:bg-sunken lg:hidden"><ArrowLeft size={20} /></Link>
          <button onClick={() => setPanel((v) => !v)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <Avatar name={meta.title} src={meta.other?.photoURL} size={42} online={isGroup ? undefined : otherOnline} group={isGroup ? { color: conversation.color, icon: conversation.icon } : undefined} />
            <span className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold">{meta.title}</h1>
              <span className={cn('block truncate text-xs', typingNames.length || otherOnline ? 'text-brand-600' : 'text-mute')}>{status}</span>
            </span>
          </button>
          <div className="flex items-center">
            {!isGroup && <IconButton label="Voice call" onClick={() => call(false)}><Phone size={19} /></IconButton>}
            {!isGroup && <IconButton label="Video call" onClick={() => call(true)}><Video size={19} /></IconButton>}
            <IconButton label={isGroup ? 'Group info' : 'Contact info'} active={showPanel} onClick={() => setPanel((v) => !v)} className="2xl:hidden"><Info size={19} /></IconButton>
          </div>
        </header>

        <MessageList
          messages={messages}
          loading={loading}
          hasMore={hasMore}
          loadingMore={loadingMore}
          isGroup={isGroup}
          typingNames={typingNames}
          onLoadMore={loadMore}
          onReply={setReplyTo}
          onForward={setForwarding}
        />
        <Composer cid={cid} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} onSend={send} />
      </div>

      {wide && (
        <aside aria-label={isGroup ? 'Group details' : 'Contact details'} className="w-[320px] shrink-0 border-l border-line">
          <RightPanel conversation={conversation} messages={messages} onCall={call} onClose={() => setPanel(false)} />
        </aside>
      )}
      {!wide && panel && (
        <>
          <div className="fixed inset-0 z-40 bg-ink/40" onClick={() => setPanel(false)} />
          <aside aria-label={isGroup ? 'Group details' : 'Contact details'} className="pop-in fixed inset-y-0 right-0 z-50 w-[min(360px,100%)] shadow-pop">
            <RightPanel conversation={conversation} messages={messages} onCall={(v) => { setPanel(false); call(v) }} onClose={() => setPanel(false)} />
          </aside>
        </>
      )}

      <ForwardModal message={forwarding} onClose={() => setForwarding(null)} />
    </div>
  )
}
