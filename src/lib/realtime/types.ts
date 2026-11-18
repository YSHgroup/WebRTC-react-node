import type { User } from 'firebase/auth'
import type { Message, MessageDraft } from '@/lib/types'

export type SignalPayload =
  | { type: 'invite'; callId: string; video: boolean }
  | { type: 'accept'; callId: string }
  | { type: 'reject'; callId: string }
  | { type: 'offer'; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: 'candidate'; callId: string; candidate: RTCIceCandidateInit }
  | { type: 'end'; callId: string }

export type Unsub = () => void

/**
 * Realtime features use Firestore listeners so they run without a persistent server.
 */
export interface Transport {
  readonly mode: 'firestore'
  start(user: User): Promise<void>
  stop(): void
  sendMessage(draft: MessageDraft): Promise<Message>
  subscribeMessages(cid: string, since: number, cb: (m: Message) => void): Unsub
  sendTyping(cid: string, typing: boolean): void
  subscribeTyping(cid: string, cb: (uid: string, typing: boolean) => void): Unsub
  onPresence(cb: (online: Record<string, boolean>) => void): Unsub
  sendSignal(to: string, payload: SignalPayload): Promise<void>
  onSignal(cb: (from: string, payload: SignalPayload) => void): Unsub
}
