'use client'
import { Check, Copy, CornerUpLeft, Download, FileText, Forward } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/Avatar'
import { RichText } from '@/lib/richText'
import type { Message, UserProfile } from '@/lib/types'
import { cn, formatBytes, formatTime } from '@/lib/utils'

interface Props {
  msg: Message
  mine: boolean
  sender?: UserProfile
  showAvatar: boolean
  showName: boolean
  onReply: (m: Message) => void
  onForward: (m: Message) => void
}

export function MessageBubble({ msg, mine, sender, showAvatar, showName, onReply, onForward }: Props) {
  const att = msg.attachment
  return (
    <div id={`m-${msg.id}`} className={cn('group flex items-end gap-2.5', mine ? 'flex-row-reverse' : 'flex-row')}>
      <div className="w-9 shrink-0">
        {!mine && showAvatar && <Avatar name={msg.senderName} src={sender?.photoURL} size={36} />}
      </div>

      <div className={cn('flex max-w-[78%] flex-col sm:max-w-[68%]', mine ? 'items-end' : 'items-start')}>
        {showName && !mine && <span className="mb-1 ml-1 text-xs font-semibold text-brand-600">{msg.senderName}</span>}

        <div className={cn('flex items-center gap-1', mine && 'flex-row-reverse')}>
          <div
            className={cn(
              'min-w-0 break-words rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed',
              mine ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-bubble text-ink',
            )}
          >
            {msg.forwardedFrom && (
              <p className={cn('mb-1.5 flex items-center gap-1 text-xs', mine ? 'text-white/80' : 'text-brand-600')}>
                <Forward size={12} /> Forwarded from <b className="font-semibold">{msg.forwardedFrom}</b>
              </p>
            )}

            {msg.replyTo && (
              <button
                onClick={() => document.getElementById(`m-${msg.replyTo!.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                className={cn('mb-2 block w-full rounded-lg border-l-[3px] px-2.5 py-1.5 text-left text-xs', mine ? 'border-white/70 bg-white/15' : 'border-brand-500 bg-brand-100/60')}
              >
                <span className="block font-semibold">{msg.replyTo.senderName}</span>
                <span className="line-clamp-2 opacity-90">{msg.replyTo.text}</span>
              </button>
            )}

            {att?.kind === 'image' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={att.dataUrl} alt={att.name} className="mb-1.5 max-h-72 w-full max-w-[320px] rounded-xl object-cover" loading="lazy" />
            )}
            {att?.kind === 'file' && (
              <a href={att.dataUrl} download={att.name} className={cn('mb-1.5 flex items-center gap-3 rounded-xl p-2.5', mine ? 'bg-white/15' : 'bg-panel')}>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-500"><FileText size={20} /></span>
                <span className="min-w-0 text-left"><span className="block truncate text-sm font-medium">{att.name}</span><span className="block text-xs opacity-70">{formatBytes(att.size)}</span></span>
                <Download size={16} className="ml-1 shrink-0 opacity-70" />
              </a>
            )}

            {msg.text && <div><RichText text={msg.text} /></div>}
            <span className={cn('mt-1 flex items-center justify-end gap-1 text-[10.5px]', mine ? 'text-white/70' : 'text-mute')}>
              {formatTime(msg.createdAt)}{mine && <Check size={12} aria-label="Sent" />}
            </span>
          </div>

          {/* hover / focus toolbar; always visible on touch screens */}
          <div className="flex shrink-0 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
            <button onClick={() => onReply(msg)} aria-label="Reply" title="Reply" className="rounded-lg p-1.5 text-mute hover:bg-sunken hover:text-brand-600"><CornerUpLeft size={15} /></button>
            <button onClick={() => onForward(msg)} aria-label="Forward" title="Forward" className="rounded-lg p-1.5 text-mute hover:bg-sunken hover:text-brand-600"><Forward size={15} /></button>
            {msg.text && (
              <button onClick={() => navigator.clipboard.writeText(msg.text).then(() => toast.success('Copied'))} aria-label="Copy text" title="Copy" className="hidden rounded-lg p-1.5 text-mute hover:bg-sunken hover:text-brand-600 sm:block"><Copy size={15} /></button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
