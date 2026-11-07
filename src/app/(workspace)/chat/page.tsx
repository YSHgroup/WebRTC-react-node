import { MessageCircle } from 'lucide-react'

export default function ChatHome() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><MessageCircle size={28} /></span>
      <h1 className="text-lg font-semibold">Pick a conversation</h1>
      <p className="max-w-xs text-sm text-mute">Choose a chat from the list, or start a new one with the pencil button.</p>
    </div>
  )
}
