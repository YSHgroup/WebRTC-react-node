'use client'
import { Mic, MicOff, PhoneOff, Repeat2, Video, VideoOff } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { useMe } from '@/hooks/useMe'
import { dmId } from '@/lib/types'
import { cn, formatDuration } from '@/lib/utils'
import { endCall, toggleCam, toggleMic, useCall } from '@/lib/webrtc/callManager'
import { useChat } from '@/store/chat'

function Stream({ stream, muted, className }: { stream: MediaStream | null; muted?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => { if (ref.current) ref.current.srcObject = stream }, [stream])
  return <video ref={ref} autoPlay playsInline muted={muted} className={className} />
}

export default function CallPage() {
  const { callId } = useParams<{ callId: string }>()
  const router = useRouter()
  const { uid } = useMe()
  const call = useCall()
  const peer = useChat((s) => (call.peerId ? s.users[call.peerId] : undefined))
  const [swapped, setSwapped] = useState(false)
  const [seconds, setSeconds] = useState(0)

  // Leave when there's no matching call (refresh, finished, wrong link).
  useEffect(() => {
    if (call.phase === 'idle' || (call.callId && call.callId !== callId)) router.replace('/chat')
  }, [call.phase, call.callId, callId, router])

  useEffect(() => {
    if (call.phase !== 'ended') return
    const t = setTimeout(() => router.replace(call.peerId ? `/chat/${dmId(uid, call.peerId)}` : '/chat'), 1500)
    return () => clearTimeout(t)
  }, [call.phase, call.peerId, uid, router])

  useEffect(() => {
    if (!call.startedAt) return
    const tick = () => setSeconds(Math.floor((Date.now() - call.startedAt!) / 1000))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [call.startedAt])

  const name = peer?.displayName ?? 'Call'
  const remoteHasVideo = !!call.remoteStream?.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')
  const localHasVideo = call.video && !call.camOff
  const status =
    call.phase === 'calling' ? 'Calling…'
    : call.phase === 'connecting' ? 'Connecting…'
    : call.phase === 'connected' ? formatDuration(seconds)
    : call.phase === 'ended' ? call.notice ?? 'Call ended' : ''

  const mainStream = swapped ? call.localStream : call.remoteStream
  const pipStream = swapped ? call.remoteStream : call.localStream
  const mainHasVideo = swapped ? localHasVideo : remoteHasVideo

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#0d0b1a] text-white" role="main" aria-label={`Call with ${name}`}>
      <div className="relative flex-1 overflow-hidden">
        {mainStream && (
          <Stream stream={mainStream} muted={swapped} className={cn('absolute inset-0 h-full w-full object-cover', !mainHasVideo && 'opacity-0', swapped && '-scale-x-100')} />
        )}
        {!mainHasVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#2a1f6e] to-[#0d0b1a]">
            <Avatar name={name} src={peer?.photoURL} size={128} />
            <p className="text-xl font-semibold">{name}</p>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex flex-col items-center bg-gradient-to-b from-black/50 to-transparent px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] text-center">
          <p className="font-semibold">{name}</p>
          <p className="text-sm tabular-nums text-white/80" aria-live="polite">{status}</p>
        </div>

        {call.localStream && (
          <button
            onClick={() => setSwapped((v) => !v)}
            aria-label="Swap video views"
            className="absolute bottom-4 right-4 h-40 w-28 overflow-hidden rounded-2xl border-2 border-white/30 bg-black shadow-pop sm:h-48 sm:w-36"
          >
            {(swapped ? remoteHasVideo : localHasVideo) ? (
              <Stream stream={pipStream} muted={!swapped} className={cn('h-full w-full object-cover', !swapped && '-scale-x-100')} />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-[#241d55]"><VideoOff size={22} className="opacity-70" /></span>
            )}
          </button>
        )}
      </div>

      <div className="pb-safe flex items-center justify-center gap-5 bg-[#0d0b1a] px-4 py-6">
        <button onClick={toggleMic} aria-pressed={call.muted} aria-label={call.muted ? 'Unmute microphone' : 'Mute microphone'} className={cn('flex h-14 w-14 items-center justify-center rounded-full transition', call.muted ? 'bg-white text-ink' : 'bg-white/15 hover:bg-white/25')}>
          {call.muted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
        {call.video && (
          <button onClick={toggleCam} aria-pressed={call.camOff} aria-label={call.camOff ? 'Turn camera on' : 'Turn camera off'} className={cn('flex h-14 w-14 items-center justify-center rounded-full transition', call.camOff ? 'bg-white text-ink' : 'bg-white/15 hover:bg-white/25')}>
            {call.camOff ? <VideoOff size={22} /> : <Video size={22} />}
          </button>
        )}
        <button onClick={endCall} aria-label="End call" className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 shadow-lg transition hover:bg-red-600">
          <PhoneOff size={26} />
        </button>
        <button onClick={() => setSwapped((v) => !v)} aria-label="Swap video views" className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25">
          <Repeat2 size={22} />
        </button>
      </div>
    </div>
  )
}
