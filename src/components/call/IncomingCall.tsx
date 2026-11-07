'use client'
import { Phone, PhoneOff, Video } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/Avatar'
import { acceptCall, rejectCall, useCall } from '@/lib/webrtc/callManager'
import { useChat } from '@/store/chat'

/** Global ringing banner. Mounted once in the workspace shell. */
export function IncomingCall() {
  const router = useRouter()
  const { phase, peerId, video, callId, notice } = useCall()
  const peer = useChat((s) => (peerId ? s.users[peerId] : undefined))

  // Missed-call and error notices when no call screen is open.
  useEffect(() => {
    if (notice && phase === 'idle') toast(notice)
  }, [notice, phase])

  if (phase !== 'incoming' || !callId) return null
  const name = peer?.displayName ?? 'Someone'

  return (
    <div role="alertdialog" aria-label={`Incoming call from ${name}`} className="pop-in fixed inset-x-3 top-3 z-[60] mx-auto max-w-sm rounded-2xl bg-ink p-4 text-white shadow-pop dark:bg-panel dark:ring-1 dark:ring-line">
      <div className="flex items-center gap-3">
        <Avatar name={name} src={peer?.photoURL} size={52} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{name}</p>
          <p className="text-sm opacity-70">Incoming {video ? 'video' : 'voice'} call…</p>
        </div>
        <button onClick={rejectCall} aria-label="Decline call" className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500"><PhoneOff size={19} /></button>
        <button
          onClick={async () => { if (await acceptCall()) router.push(`/call/${callId}`) }}
          aria-label="Accept call"
          className="ring flex h-11 w-11 items-center justify-center rounded-full bg-online"
        >
          {video ? <Video size={19} /> : <Phone size={19} />}
        </button>
      </div>
    </div>
  )
}
