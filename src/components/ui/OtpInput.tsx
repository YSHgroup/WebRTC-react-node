'use client'
import { useRef } from 'react'

export function OtpInput({ value, onChange, length = 6, disabled }: {
  value: string; onChange: (v: string) => void; length?: number; disabled?: boolean
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  const setAt = (i: number, d: string) => {
    const next = digits.slice()
    next[i] = d
    onChange(next.join('').slice(0, length))
  }

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="Verification code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          className="field h-12 w-full px-0 text-center text-lg font-semibold"
          onChange={(e) => {
            const c = e.target.value.replace(/\D/g, '').slice(-1)
            setAt(i, c)
            if (c && i < length - 1) refs.current[i + 1]?.focus()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !d && i > 0) refs.current[i - 1]?.focus()
          }}
          onPaste={(e) => {
            const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
            if (t) { e.preventDefault(); onChange(t); refs.current[Math.min(t.length, length - 1)]?.focus() }
          }}
        />
      ))}
    </div>
  )
}
