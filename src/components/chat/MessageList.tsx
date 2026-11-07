'use client'
import { Loader2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { useMe } from '@/hooks/useMe'
import type { Message } from '@/lib/types'
import { formatDay, sameDay } from '@/lib/utils'
import { useChat } from '@/store/chat'
import { MessageBubble } from './MessageBubble'

interface Props {
  messages: Message[]
  loading: boolean
  hasMore: boolean
  loadingMore: boolean
  isGroup: boolean
  typingNames: string[]
  onLoadMore: () => void
  onReply: (m: Message) => void
  onForward: (m: Message) => void
}

export function MessageList({ messages, loading, hasMore, loadingMore, isGroup, typingNames, onLoadMore, onReply, onForward }: Props) {
  const { uid } = useMe()
  const users = useChat((s) => s.users)
  const scroller = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const prevHeight = useRef(0)
  const prevFirst = useRef<string | null>(null)

  const onScroll = () => {
    const el = scroller.current
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }

  // keep pinned to the bottom for new messages; keep position when older ones are prepended
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const first = messages[0]?.id ?? null
    if (prevFirst.current && first !== prevFirst.current && !stick.current) {
      el.scrollTop += el.scrollHeight - prevHeight.current
    } else if (stick.current || messages[messages.length - 1]?.senderId === uid) {
      el.scrollTop = el.scrollHeight
    }
    prevFirst.current = first
    prevHeight.current = el.scrollHeight
  }, [messages, uid, typingNames.length])

  useEffect(() => { stick.current = true }, [])

  return (
    <div ref={scroller} onScroll={onScroll} className="scroll-thin flex-1 space-y-1 overflow-y-auto px-4 py-4 sm:px-6" role="log" aria-live="polite" aria-label="Messages">
      {hasMore && (
        <div className="flex justify-center pb-2">
          <button onClick={onLoadMore} disabled={loadingMore} className="rounded-full bg-sunken px-4 py-1.5 text-xs font-medium text-mute hover:text-ink">
            {loadingMore ? <Loader2 size={14} className="animate-spin" /> : 'Load earlier messages'}
          </button>
        </div>
      )}
      {loading && messages.length === 0 && <p className="py-10 text-center text-sm text-mute">Loading messages…</p>}
      {!loading && messages.length === 0 && (
        <p className="py-16 text-center text-sm text-mute">No messages yet. Say hello 👋</p>
      )}

      {messages.map((m, i) => {
        const prev = messages[i - 1]
        const next = messages[i + 1]
        const newDay = !prev || !sameDay(prev.createdAt, m.createdAt)
        const lastOfRun = !next || next.senderId !== m.senderId || !sameDay(next.createdAt, m.createdAt)
        const firstOfRun = !prev || prev.senderId !== m.senderId || newDay
        return (
          <div key={m.id} className={firstOfRun && !newDay ? 'pt-3' : ''}>
            {newDay && (
              <div className="my-4 flex justify-center"><span className="rounded-full bg-sunken px-3 py-1 text-xs text-mute">{formatDay(m.createdAt)}</span></div>
            )}
            <MessageBubble
              msg={m}
              mine={m.senderId === uid}
              sender={users[m.senderId]}
              showAvatar={lastOfRun}
              showName={isGroup && firstOfRun}
              onReply={onReply}
              onForward={onForward}
            />
          </div>
        )
      })}

      {typingNames.length > 0 && (
        <div className="flex items-center gap-2 pl-11 pt-2 text-xs text-mute" aria-live="polite">
          <span className="flex gap-0.5">{[0, 1, 2].map((i) => <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-mute" style={{ animationDelay: `${i * 0.15}s` }} />)}</span>
          {typingNames.join(', ')} {typingNames.length > 1 ? 'are' : 'is'} typing…
        </div>
      )}
    </div>
  )
}
