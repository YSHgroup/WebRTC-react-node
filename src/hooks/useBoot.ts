'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'
import {
  ensureDefaultGroupsOnce, subscribeConversations, subscribeProfile, subscribeUsers, upsertProfile,
} from '@/lib/chat/data'
import { getTransport, resetTransport } from '@/lib/realtime'
import { handleSignal } from '@/lib/webrtc/callManager'
import { useAuth } from '@/store/auth'
import { useChat } from '@/store/chat'

/**
 * Guards the workspace and wires every live source into the stores:
 * profile, people, conversations, presence (transport) and call signalling (transport).
 */
export function useBoot() {
  const router = useRouter()
  const status = useAuth((s) => s.status)
  const user = useAuth((s) => s.user)
  const uid = user?.uid

  useEffect(() => {
    if (status === 'out') router.replace('/login')
    if (status === 'unverified') router.replace('/register?verify=1')
  }, [status, router])

  useEffect(() => {
    if (status !== 'ready' || !user) return
    let cancelled = false
    const unsubs: (() => void)[] = []
    const transport = getTransport()

    ;(async () => {
      try {
        await upsertProfile(user)
        await ensureDefaultGroupsOnce(user.uid)
        await transport.start(user)
      } catch (e) {
        if (!cancelled) toast.error((e as Error).message || 'Could not connect. Check your network.')
        return
      }
      if (cancelled) { transport.stop(); return }
      unsubs.push(
        subscribeProfile(user.uid, (p) => useAuth.getState().setProfile(p)),
        subscribeUsers((list) => useChat.getState().setUsers(list)),
        subscribeConversations(user.uid, (list) => useChat.getState().setConversations(list)),
        transport.onPresence((p) => useChat.getState().setPresence(p)),
        transport.onSignal((from, payload) => { handleSignal(from, payload) }),
      )
    })()

    return () => {
      cancelled = true
      unsubs.forEach((u) => u())
      transport.stop()
      resetTransport()
      useChat.getState().reset()
    }
    // re-run only when the signed-in person changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, uid])

  return status
}
