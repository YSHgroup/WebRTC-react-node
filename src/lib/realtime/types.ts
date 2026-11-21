import type { Message } from '@/lib/types'

export type SignalPayload =
  | { type: 'invite'; callId: string; video: boolean }
  | { type: 'accept'; callId: string }
  | { type: 'reject'; callId: string }
  | { type: 'offer'; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: 'candidate'; callId: string; candidate: RTCIceCandidateInit }
  | { type: 'end'; callId: string }

/** Events the server drops into a person's private inbox. */
export type InboxEvent =
  | { t: 'm'; cid: string; id: string; msg?: Message }
  | { t: 'conv'; cid: string }

export type Unsub = () => void

export interface PresenceInfo {
  online: Record<string, boolean>
  lastSeen: Record<string, number>
}

export interface Transport {
  readonly uid: string
  stop(): void
  serverNow(): number
  onConnection(cb: (connected: boolean) => void): Unsub
  onInbox(cb: (e: InboxEvent) => void): Unsub
  onPresence(cb: (p: PresenceInfo) => void): Unsub
  sendTyping(cid: string, typing: boolean): void
  subscribeTyping(cid: string, cb: (uid: string, typing: boolean) => void): Unsub
  sendSignal(to: string, payload: SignalPayload): Promise<void>
  onSignal(cb: (from: string, payload: SignalPayload) => void): Unsub
}
