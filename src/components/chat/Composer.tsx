'use client'
import {
  Bold, Code, Image as ImageIcon, Italic, List, Paperclip, Quote, SendHorizontal, Smile, Strikethrough, Underline, X,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { IconButton } from '@/components/ui/IconButton'
import { getTransport } from '@/lib/realtime'
import { fileToAttachment } from '@/lib/image'
import { emoticons } from '@/lib/richText'
import type { Attachment, Message } from '@/lib/types'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false, loading: () => <div className="h-[380px] w-[320px] rounded-2xl bg-panel" /> })

interface Props {
  cid: string
  replyTo: Message | null
  onCancelReply: () => void
  onSend: (text: string, attachment?: Attachment) => Promise<void>
}

export function Composer({ cid, replyTo, onCancelReply, onSend }: Props) {
  const [text, setText] = useState('')
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [emoji, setEmoji] = useState(false)
  const [sending, setSending] = useState(false)
  const area = useRef<HTMLTextAreaElement>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const lastTyping = useRef(0)
  const stopTimer = useRef<ReturnType<typeof setTimeout>>()

  // typing indicator: "true" at most every 2.5 s, "false" 3 s after the last key
  const signalTyping = useCallback(() => {
    const t = getTransport()
    if (Date.now() - lastTyping.current > 2500) { lastTyping.current = Date.now(); t.sendTyping(cid, true) }
    clearTimeout(stopTimer.current)
    stopTimer.current = setTimeout(() => { lastTyping.current = 0; t.sendTyping(cid, false) }, 3000)
  }, [cid])

  useEffect(() => () => { clearTimeout(stopTimer.current); try { getTransport().sendTyping(cid, false) } catch {} }, [cid])
  useEffect(() => { setText(''); setAttachment(null) }, [cid])
  useEffect(() => { if (replyTo) area.current?.focus() }, [replyTo])

  useEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [text])

  const edit = (next: string, selStart: number, selEnd: number) => {
    setText(next)
    requestAnimationFrame(() => { area.current?.focus(); area.current?.setSelectionRange(selStart, selEnd) })
  }

  const wrap = (before: string, after = before) => {
    const el = area.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e, value } = el
    const sel = value.slice(s, e) || 'text'
    edit(value.slice(0, s) + before + sel + after + value.slice(e), s + before.length, s + before.length + sel.length)
  }

  const prefixLines = (prefix: string) => {
    const el = area.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e, value } = el
    const from = value.lastIndexOf('\n', s - 1) + 1
    const block = value.slice(from, e)
    const lines = block.split('\n')
    const all = lines.every((l) => l.startsWith(prefix))
    const out = lines.map((l) => (all ? l.slice(prefix.length) : prefix + l)).join('\n')
    edit(value.slice(0, from) + out + value.slice(e), from, from + out.length)
  }

  const insert = (str: string) => {
    const el = area.current
    const s = el?.selectionStart ?? text.length
    const e = el?.selectionEnd ?? text.length
    edit(text.slice(0, s) + str + text.slice(e), s + str.length, s + str.length)
  }

  const pickFile = async (file?: File | null) => {
    if (!file) return
    try { setAttachment(await fileToAttachment(file)) } catch (err) { toast.error((err as Error).message) }
  }

  const submit = async () => {
    const body = emoticons(text).trim()
    if ((!body && !attachment) || sending) return
    setSending(true)
    try {
      await onSend(body, attachment ?? undefined)
      setText(''); setAttachment(null); setEmoji(false)
      clearTimeout(stopTimer.current); lastTyping.current = 0; getTransport().sendTyping(cid, false)
    } catch (err) {
      toast.error((err as Error).message || 'Message could not be sent')
    } finally { setSending(false) }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey
    if (mod && e.key.toLowerCase() === 'b') { e.preventDefault(); wrap('**') }
    else if (mod && e.key.toLowerCase() === 'i') { e.preventDefault(); wrap('*') }
    else if (mod && e.key.toLowerCase() === 'u') { e.preventDefault(); wrap('__') }
    else if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit() }
  }

  return (
    <div className="pb-safe border-t border-line bg-panel px-3 pb-3 pt-3 sm:px-5">
      <div className="relative rounded-2xl border border-line bg-panel focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/15">
        {replyTo && (
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2 text-xs">
            <span className="min-w-0 truncate text-brand-600">Replying to <b>{replyTo.senderName}</b> <span className="text-mute">· {replyTo.text || 'Attachment'}</span></span>
            <button onClick={onCancelReply} aria-label="Cancel reply" className="text-mute hover:text-ink"><X size={15} /></button>
          </div>
        )}

        {attachment && (
          <div className="flex items-center gap-3 px-4 pt-3">
            {attachment.kind === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={attachment.dataUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <span className="rounded-xl bg-sunken px-3 py-2 text-sm">{attachment.name}</span>
            )}
            <button onClick={() => setAttachment(null)} aria-label="Remove attachment" className="rounded-full bg-sunken p-1 text-mute hover:text-ink"><X size={14} /></button>
          </div>
        )}

        <textarea
          ref={area}
          value={text}
          rows={1}
          maxLength={4000}
          onChange={(e) => { setText(e.target.value); signalTyping() }}
          onKeyDown={onKeyDown}
          placeholder="Type a message…"
          aria-label="Message"
          className="block max-h-40 w-full resize-none bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-mute/70"
        />

        <div className="flex items-center gap-0.5 px-2 pb-2">
          <div className="scroll-thin flex flex-1 items-center gap-0.5 overflow-x-auto" role="toolbar" aria-label="Formatting">
            <IconButton label="Bold (Ctrl+B)" onClick={() => wrap('**')}><Bold size={16} /></IconButton>
            <IconButton label="Italic (Ctrl+I)" onClick={() => wrap('*')}><Italic size={16} /></IconButton>
            <IconButton label="Underline (Ctrl+U)" onClick={() => wrap('__')}><Underline size={16} /></IconButton>
            <IconButton label="Strikethrough" onClick={() => wrap('~~')}><Strikethrough size={16} /></IconButton>
            <IconButton label="Code" onClick={() => wrap('`')}><Code size={16} /></IconButton>
            <IconButton label="Quote" onClick={() => prefixLines('> ')}><Quote size={16} /></IconButton>
            <IconButton label="Bulleted list" onClick={() => prefixLines('- ')}><List size={16} /></IconButton>
            <span className="mx-1 h-5 w-px shrink-0 bg-line" />
            <IconButton label="Send a photo" onClick={() => photoInput.current?.click()}><ImageIcon size={16} /></IconButton>
            <IconButton label="Emoji" active={emoji} onClick={() => setEmoji((v) => !v)}><Smile size={16} /></IconButton>
            <IconButton label="Attach a file" onClick={() => fileInput.current?.click()}><Paperclip size={16} /></IconButton>
          </div>
          <button
            onClick={submit}
            disabled={sending || (!text.trim() && !attachment)}
            aria-label="Send message"
            className="ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
          >
            <SendHorizontal size={18} />
          </button>
        </div>

        {emoji && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setEmoji(false)} />
            <div className="pop-in absolute bottom-full left-0 z-30 mb-2 max-w-full">
              <EmojiPicker
                onEmojiClick={(e) => insert(e.emoji)}
                width={Math.min(340, typeof window !== 'undefined' ? window.innerWidth - 24 : 340)}
                height={380}
                lazyLoadEmojis
                theme={(typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light') as never}
                previewConfig={{ showPreview: false }}
                searchPlaceHolder="Search emoji"
              />
            </div>
          </>
        )}
      </div>

      <input ref={photoInput} type="file" accept="image/*" hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = '' }} />
      <input ref={fileInput} type="file" hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = '' }} />
    </div>
  )
}
