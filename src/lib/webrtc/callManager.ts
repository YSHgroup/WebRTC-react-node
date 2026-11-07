import { create } from 'zustand'
import { getTransport, type SignalPayload } from '@/lib/realtime'

export type CallPhase = 'idle' | 'calling' | 'incoming' | 'connecting' | 'connected' | 'ended'

interface CallState {
  phase: CallPhase
  callId: string | null
  peerId: string | null
  video: boolean
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  muted: boolean
  camOff: boolean
  startedAt: number | null
  notice: string | null
}

const idle: CallState = {
  phase: 'idle', callId: null, peerId: null, video: true, localStream: null, remoteStream: null,
  muted: false, camOff: false, startedAt: null, notice: null,
}

export const useCall = create<CallState>(() => idle)
const set = useCall.setState
const get = useCall.getState

const iceServers: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
]
if (process.env.NEXT_PUBLIC_TURN_URL) {
  iceServers.push({
    urls: process.env.NEXT_PUBLIC_TURN_URL,
    username: process.env.NEXT_PUBLIC_TURN_USERNAME,
    credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
  })
}

let pc: RTCPeerConnection | null = null
let pendingCandidates: RTCIceCandidateInit[] = []
let ringTimeout: ReturnType<typeof setTimeout> | null = null
let resetTimeout: ReturnType<typeof setTimeout> | null = null

const send = (to: string, payload: SignalPayload) => getTransport().sendSignal(to, payload).catch(() => {})

async function getMedia(video: boolean) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Your browser does not support calls.')
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
    })
  } catch {
    throw new Error('Allow camera and microphone access in your browser to place calls.')
  }
}

function createPc(peerId: string, callId: string) {
  const conn = new RTCPeerConnection({ iceServers })
  const remote = new MediaStream()
  set({ remoteStream: remote })
  get().localStream?.getTracks().forEach((t) => conn.addTrack(t, get().localStream!))
  conn.onicecandidate = (e) => {
    if (e.candidate) send(peerId, { type: 'candidate', callId, candidate: e.candidate.toJSON() })
  }
  conn.ontrack = (e) => {
    e.streams[0]?.getTracks().forEach((t) => { if (!remote.getTracks().includes(t)) remote.addTrack(t) })
    set({ remoteStream: new MediaStream(remote.getTracks()) }) // new ref → React re-renders
  }
  conn.onconnectionstatechange = () => {
    if (conn.connectionState === 'connected') {
      if (ringTimeout) clearTimeout(ringTimeout)
      set({ phase: 'connected', startedAt: get().startedAt ?? Date.now() })
    }
    if (conn.connectionState === 'failed') finish('Connection lost', true)
  }
  pc = conn
  return conn
}

function cleanup() {
  if (ringTimeout) clearTimeout(ringTimeout)
  get().localStream?.getTracks().forEach((t) => t.stop())
  pc?.close()
  pc = null
  pendingCandidates = []
}

/** Ends the call locally; optionally tells the other person. */
function finish(notice: string | null, notifyPeer: boolean) {
  const { peerId, callId, phase } = get()
  if (phase === 'idle') return
  if (notifyPeer && peerId && callId) send(peerId, { type: 'end', callId })
  cleanup()
  set({ ...idle, phase: 'ended', callId, peerId, notice })
  if (resetTimeout) clearTimeout(resetTimeout)
  resetTimeout = setTimeout(() => set({ ...idle }), 1800)
}

export async function startCall(peerId: string, video: boolean): Promise<string | null> {
  if (get().phase !== 'idle' && get().phase !== 'ended') return null
  if (resetTimeout) clearTimeout(resetTimeout)
  const callId = crypto.randomUUID()
  try {
    const stream = await getMedia(video)
    set({ ...idle, phase: 'calling', callId, peerId, video, localStream: stream })
  } catch (e) {
    set({ ...idle, notice: (e as Error).message })
    throw e
  }
  send(peerId, { type: 'invite', callId, video })
  ringTimeout = setTimeout(() => finish('No answer', true), 45_000)
  return callId
}

export async function acceptCall() {
  const { callId, peerId, video, phase } = get()
  if (phase !== 'incoming' || !callId || !peerId) return false
  try {
    const stream = await getMedia(video)
    set({ localStream: stream, phase: 'connecting' })
    createPc(peerId, callId)
    send(peerId, { type: 'accept', callId })
    return true
  } catch (e) {
    send(peerId, { type: 'reject', callId })
    set({ ...idle, notice: (e as Error).message })
    return false
  }
}

export function rejectCall() {
  const { callId, peerId } = get()
  if (peerId && callId) send(peerId, { type: 'reject', callId })
  cleanup()
  set({ ...idle })
}

export const endCall = () => finish('Call ended', true)

export function toggleMic() {
  const next = !get().muted
  get().localStream?.getAudioTracks().forEach((t) => (t.enabled = !next))
  set({ muted: next })
}

export function toggleCam() {
  const next = !get().camOff
  get().localStream?.getVideoTracks().forEach((t) => (t.enabled = !next))
  set({ camOff: next })
}

async function flushCandidates() {
  if (!pc) return
  for (const c of pendingCandidates) await pc.addIceCandidate(c).catch(() => {})
  pendingCandidates = []
}

export async function handleSignal(from: string, p: SignalPayload) {
  const s = get()
  if (p.type === 'invite') {
    if (s.phase !== 'idle' && s.phase !== 'ended') return void send(from, { type: 'reject', callId: p.callId }) // busy
    if (resetTimeout) clearTimeout(resetTimeout)
    set({ ...idle, phase: 'incoming', callId: p.callId, peerId: from, video: p.video })
    ringTimeout = setTimeout(() => { if (get().phase === 'incoming') finish('Missed call', false) }, 45_000)
    return
  }
  if (p.callId !== s.callId) return

  switch (p.type) {
    case 'accept': {
      if (!s.peerId) return
      const conn = createPc(s.peerId, p.callId)
      set({ phase: 'connecting' })
      const offer = await conn.createOffer()
      await conn.setLocalDescription(offer)
      send(s.peerId, { type: 'offer', callId: p.callId, sdp: offer })
      break
    }
    case 'offer': {
      if (!pc || !s.peerId) return
      await pc.setRemoteDescription(p.sdp)
      await flushCandidates()
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      send(s.peerId, { type: 'answer', callId: p.callId, sdp: answer })
      break
    }
    case 'answer':
      if (!pc) return
      await pc.setRemoteDescription(p.sdp)
      await flushCandidates()
      break
    case 'candidate':
      if (pc?.remoteDescription) await pc.addIceCandidate(p.candidate).catch(() => {})
      else pendingCandidates.push(p.candidate)
      break
    case 'reject':
      finish('Call declined', false)
      break
    case 'end':
      finish(s.phase === 'incoming' ? 'Missed call' : 'Call ended', false)
      break
  }
}
