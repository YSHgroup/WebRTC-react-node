'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchMessages } from '@/lib/chat/data'
import { getTransport } from '@/lib/realtime'
import type { Message } from '@/lib/types'
import { useChat } from '@/store/chat'

const PAGE = 40
const EMPTY: Message[] = []

/** Loads history, then keeps a conversation live through the active transport. */
export function useConversation(cid: string) {
  const ready = useChat((s) => s.ready)
  const messages = useChat((s) => s.messages[cid]) ?? EMPTY
  const typingMap = useChat((s) => s.typing[cid])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    if (!ready) return
    const chat = useChat.getState()
    chat.setActive(cid)
    setLoading(true)
    let cancelled = false
    let unsubMsgs: (() => void) | null = null
    let unsubTyping: (() => void) | null = null
    const transport = getTransport()

    fetchMessages(cid, PAGE)
      .then((msgs) => {
        if (cancelled) return
        chat.mergeMessages(cid, msgs)
        setHasMore(msgs.length === PAGE)
        const since = msgs.length ? msgs[msgs.length - 1].createdAt : Date.now() - 5000
        unsubMsgs = transport.subscribeMessages(cid, since, (m) => useChat.getState().mergeMessages(cid, [m]))
        unsubTyping = transport.subscribeTyping(cid, (uid, on) => {
          useChat.getState().setTyping(cid, uid, on)
          clearTimeout(timers.current[uid])
          if (on) timers.current[uid] = setTimeout(() => useChat.getState().setTyping(cid, uid, false), 6000) // safety net
        })
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
      unsubMsgs?.()
      unsubTyping?.()
      Object.values(timers.current).forEach(clearTimeout)
      useChat.getState().setActive(null)
    }
  }, [cid, ready])

  const loadMore = useCallback(async () => {
    const first = useChat.getState().messages[cid]?.[0]
    if (!first || loadingMore) return
    setLoadingMore(true)
    try {
      const older = await fetchMessages(cid, PAGE, first.createdAt)
      useChat.getState().mergeMessages(cid, older)
      setHasMore(older.length === PAGE)
    } finally { setLoadingMore(false) }
  }, [cid, loadingMore])

  return { messages, loading, hasMore, loadingMore, loadMore, typingUids: Object.keys(typingMap ?? {}) }
}
