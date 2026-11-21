'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchMessages, markRead } from '@/lib/chat/data'
import { getTransport } from '@/lib/realtime'
import type { Message } from '@/lib/types'
import { useChat } from '@/store/chat'

const PAGE = 40
const EMPTY: Message[] = []

/** Loads history from the API, then listens for typing. New messages arrive through the global inbox (see useBoot). */
export function useConversation(cid: string) {
  const ready = useChat((s) => s.ready)
  const live = useChat((s) => s.live)
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

    fetchMessages(cid, PAGE)
      .then((msgs) => {
        if (cancelled) return
        useChat.getState().mergeMessages(cid, msgs)
        setHasMore(msgs.length === PAGE)
        markRead(cid)
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
      Object.values(timers.current).forEach(clearTimeout)
      useChat.getState().setActive(null)
    }
  }, [cid, ready])

  // typing indicators only exist while realtime is connected
  useEffect(() => {
    const t = live ? getTransport() : null
    if (!t) return
    const off = t.subscribeTyping(cid, (uid, on) => {
      useChat.getState().setTyping(cid, uid, on)
      clearTimeout(timers.current[uid])
      if (on) timers.current[uid] = setTimeout(() => useChat.getState().setTyping(cid, uid, false), 9000) // safety net
    })
    return off
  }, [cid, live])

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
