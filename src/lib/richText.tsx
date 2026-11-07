import { Fragment, type ReactNode } from 'react'

/**
 * Tiny, safe formatter (no HTML injection): **bold**  *italic*  __underline__  ~~strike~~  `code`
 * Lines starting with "> " become quotes, "- " become list items. Plus :) → 😊 style emoticons.
 */
const EMOTICONS: [RegExp, string][] = [
  [/(^|\s):-?\)(?=\s|$)/g, '$1🙂'], [/(^|\s):-?D(?=\s|$)/g, '$1😄'], [/(^|\s):-?\((?=\s|$)/g, '$1🙁'],
  [/(^|\s);-?\)(?=\s|$)/g, '$1😉'], [/(^|\s):-?P(?=\s|$)/gi, '$1😛'], [/(^|\s)<3(?=\s|$)/g, '$1❤️'],
  [/(^|\s):'\((?=\s|$)/g, '$1😢'], [/(^|\s):-?O(?=\s|$)/g, '$1😮'],
]
export const emoticons = (t: string) => EMOTICONS.reduce((acc, [re, to]) => acc.replace(re, to), t)

const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(~~[^~\n]+~~)|(\*[^*\n]+\*)|(https?:\/\/[^\s<]+)/g

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let i = 0
  for (const m of text.matchAll(INLINE)) {
    const idx = m.index ?? 0
    if (idx > last) out.push(text.slice(last, idx))
    const tok = m[0]
    const key = `${keyBase}-${i++}`
    if (m[1]) out.push(<code key={key} className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/15">{tok.slice(1, -1)}</code>)
    else if (m[2]) out.push(<strong key={key}>{inline(tok.slice(2, -2), key)}</strong>)
    else if (m[3]) out.push(<u key={key}>{inline(tok.slice(2, -2), key)}</u>)
    else if (m[4]) out.push(<s key={key}>{inline(tok.slice(2, -2), key)}</s>)
    else if (m[5]) out.push(<em key={key}>{inline(tok.slice(1, -1), key)}</em>)
    else if (m[6]) out.push(<a key={key} href={tok} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-2 break-all">{tok}</a>)
    last = idx + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function RichText({ text }: { text: string }) {
  const lines = emoticons(text).split('\n')
  const blocks: ReactNode[] = []
  let list: string[] = []
  const flush = (k: number) => {
    if (!list.length) return
    blocks.push(
      <ul key={`ul-${k}`} className="my-1 list-disc space-y-0.5 pl-5">
        {list.map((li, j) => <li key={j}>{inline(li, `li-${k}-${j}`)}</li>)}
      </ul>,
    )
    list = []
  }
  lines.forEach((line, k) => {
    if (line.startsWith('- ')) { list.push(line.slice(2)); return }
    flush(k)
    if (line.startsWith('> ')) {
      blocks.push(<blockquote key={k} className="my-1 border-l-2 border-current pl-2 opacity-90">{inline(line.slice(2), `q-${k}`)}</blockquote>)
    } else {
      blocks.push(<Fragment key={k}>{inline(line, `l-${k}`)}{k < lines.length - 1 && <br />}</Fragment>)
    }
  })
  flush(lines.length)
  return <>{blocks}</>
}
