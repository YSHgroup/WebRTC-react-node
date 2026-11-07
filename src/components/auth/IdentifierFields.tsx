'use client'
import { Eye, EyeOff, Lock, Mail, Phone, User as UserIcon } from 'lucide-react'
import { useState } from 'react'
import type { CountryCode } from 'libphonenumber-js'
import { COUNTRIES, looksLikeEmail, looksLikePhone } from '@/lib/phone'

export type IdKind = 'email' | 'phone' | 'unknown'
export const kindOf = (v: string): IdKind => (looksLikeEmail(v) ? 'email' : looksLikePhone(v) ? 'phone' : 'unknown')

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute">{children}</span>
}

export function NameField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Icon><UserIcon size={17} /></Icon>
      <input className="field pl-10" placeholder="Full name" autoComplete="name" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Full name" required />
    </div>
  )
}

/** One field that accepts an email or a phone number. Shows a country picker when it looks like a phone. */
export function IdentifierField({ value, onChange, country, onCountry }: {
  value: string; onChange: (v: string) => void; country: CountryCode; onCountry: (c: CountryCode) => void
}) {
  const kind = kindOf(value)
  return (
    <div className="flex gap-2">
      {kind === 'phone' && !value.trim().startsWith('+') && (
        <select
          aria-label="Country"
          value={country}
          onChange={(e) => onCountry(e.target.value as CountryCode)}
          className="field w-[92px] shrink-0 px-2"
        >
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.code} {c.dial}</option>)}
        </select>
      )}
      <div className="relative flex-1">
        <Icon>{kind === 'phone' ? <Phone size={17} /> : <Mail size={17} />}</Icon>
        <input
          className="field pl-10"
          placeholder="Email or phone number"
          autoComplete="username"
          inputMode={kind === 'phone' ? 'tel' : 'email'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Email or phone number"
          required
        />
      </div>
    </div>
  )
}

export function PasswordField({ value, onChange, autoComplete }: { value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Icon><Lock size={17} /></Icon>
      <input
        className="field pl-10 pr-11"
        type={show ? 'text' : 'password'}
        placeholder="Password"
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Password"
        minLength={6}
        required
      />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-mute hover:text-ink">
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  )
}
