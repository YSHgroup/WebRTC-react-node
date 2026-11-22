'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { fetchConversations, fetchMessagesAfter, fetchUsers, loadBootstrap, markRead } from '@/lib/chat/data'
import { startTransport, stopTransport, type InboxEvent } from '@/lib/realtime'
import { handleSignal } from '@/lib/webrtc/callManager'
import { useAuth } from '@/store/auth'
import { useChat } from '@/store/chat'
import { conversationNotificationsEnabled, playNotificationSound, showMessageNotification } from '@/lib/notifications'

const POLL_MS = 8000

async function refreshConversations() {
  try { useChat.getState().setConversations(await fetchConversations()) } catch { /* next tick */ }
}

async function refreshUsers() {
  try { useChat.getState().setUsers(await fetchUsers()) } catch { /* next tick */ }
}

/** Catches the open conversation up on anything missed (reconnects, background tabs, polling mode). */
export async function resyncActive() {
  const { activeCid, messages } = useChat.getState()
  if (!activeCid) return
  const list = messages[activeCid]
  const last = list?.length ? list[list.length - 1].createdAt : 0
  if (!last) return
  try {
    const me = useAuth.getState().me?.uid ?? ''
    const fresh = await fetchMessagesAfter(activeCid, last)
    fresh.forEach((m) => useChat.getState().receiveMessage(m, me))
    if (fresh.length) useChat.getState().mergeMessages(activeCid, fresh)
    if (fresh.length) markRead(activeCid)
  } catch { /* next tick */ }
}

/**
 * Guards the workspace and wires every live source into the stores.
 * Data comes from the REST API (Postgres). Realtime (Firebase RTDB) only nudges the app; if it is unavailable
 * the app keeps working by polling.
 */
export function useBoot() {
  const router = useRouter()
  const status = useAuth((s) => s.status)
  const uid = useAuth((s) => s.me?.uid)

  useEffect(() => {
    if (status === 'out') router.replace('/login')
    if (status === 'unverified') router.replace('/register?verify=1')
  }, [status, router])

  useEffect(() => {
    if (status !== 'ready' || !uid) return
    let cancelled = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    const unsubs: (() => void)[] = []

    const onInbox = (e: InboxEvent) => {
      const chat = useChat.getState()
      if (e.t === 'conv') return void refreshConversations()
      if (!e.msg) {
        // big message: delivered as a ping, fetch what we are missing
        refreshConversations()
        if (e.cid === chat.activeCid) resyncActive()
        return
      }
      const known = chat.conversations.some((c) => c.id === e.cid)
      if (!known) refreshConversations()
      if (!chat.users[e.msg.senderId]) refreshUsers()
      chat.receiveMessage(e.msg, uid)
      if (e.cid === chat.activeCid && e.msg.senderId !== uid) markRead(e.cid)
      if (e.msg.senderId !== uid && conversationNotificationsEnabled(e.cid)) {
        const sender = chat.users[e.msg.senderId]?.displayName ?? e.msg.senderName
        const conversation = chat.conversations.find((c) => c.id === e.cid)
        showMessageNotification(conversation?.name ?? sender, e.msg.text || 'Sent an attachment')
        if (chat.activeCid !== e.cid) playNotificationSound()
      }
    }

    ;(async () => {
      try {
        const data = await loadBootstrap()
        if (cancelled) return
        useAuth.getState().setUser(data.me)
        useChat.getState().setUsers(data.users)
        useChat.getState().setConversations(data.conversations)
      } catch (e) {
        if (!cancelled) toast.error((e as Error).message || 'Could not load your workspace.')
        return
      }

      const connect = async () => {
        try {
          const t = await startTransport()
          if (cancelled) { stopTransport(); return }
          unsubs.push(
            t.onConnection((up) => {
              const wasDown = !useChat.getState().live
              useChat.getState().setLive(up)
              if (up && wasDown) { refreshConversations(); resyncActive() }
            }),
            t.onInbox(onInbox),
            t.onSignal((from, payload) => { handleSignal(from, payload) }),
            t.onPresence((p) => useChat.getState().setPresence(p.online, p.lastSeen)),
          )
        } catch (e) {
          if (cancelled) return
          const detail = e instanceof Error ? e.message : String(e)
          console.error('Realtime connection failed; retrying:', e)
          useChat.getState().setLive(false, detail)
          reconnectTimer = setTimeout(() => { void connect() }, 5000)
        }
      }

      void connect()
    })()

    // Safety net: polling when realtime is down, plus a slow refresh of the people directory.
    const poll = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      if (!useChat.getState().live) { refreshConversations(); resyncActive() }
    }, POLL_MS)
    const people = setInterval(() => { if (document.visibilityState === 'visible') refreshUsers() }, 5 * 60_000)
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      refreshConversations(); resyncActive(); refreshUsers()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      unsubs.forEach((u) => u())
      if (reconnectTimer) clearTimeout(reconnectTimer)
      clearInterval(poll)
      clearInterval(people)
      document.removeEventListener('visibilitychange', onVisible)
      stopTransport()
      useChat.getState().reset()
    }
  }, [status, uid])

  return status
}
