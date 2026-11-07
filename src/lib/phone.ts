import { AsYouType, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'

export const looksLikeEmail = (v: string) => v.includes('@')

/** Digits (and a leading +) only — i.e. "this is probably a phone number". */
export const looksLikePhone = (v: string) => /^\+?[\d\s().-]{4,}$/.test(v.trim()) && !v.includes('@')

export function parsePhone(raw: string, country: CountryCode = 'US') {
  const p = parsePhoneNumberFromString(raw, country)
  if (!p || !p.isValid()) return null
  return { e164: p.number, pretty: p.formatInternational(), country: p.country }
}

export const formatAsYouType = (raw: string, country: CountryCode = 'US') => new AsYouType(country).input(raw)

export const COUNTRIES: { code: CountryCode; name: string; dial: string }[] = [
  { code: 'US', name: 'United States', dial: '+1' },
  { code: 'CA', name: 'Canada', dial: '+1' },
  { code: 'GB', name: 'United Kingdom', dial: '+44' },
  { code: 'DE', name: 'Germany', dial: '+49' },
  { code: 'FR', name: 'France', dial: '+33' },
  { code: 'ES', name: 'Spain', dial: '+34' },
  { code: 'IT', name: 'Italy', dial: '+39' },
  { code: 'NL', name: 'Netherlands', dial: '+31' },
  { code: 'SE', name: 'Sweden', dial: '+46' },
  { code: 'PL', name: 'Poland', dial: '+48' },
  { code: 'UA', name: 'Ukraine', dial: '+380' },
  { code: 'TR', name: 'Türkiye', dial: '+90' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971' },
  { code: 'IN', name: 'India', dial: '+91' },
  { code: 'PK', name: 'Pakistan', dial: '+92' },
  { code: 'BD', name: 'Bangladesh', dial: '+880' },
  { code: 'CN', name: 'China', dial: '+86' },
  { code: 'JP', name: 'Japan', dial: '+81' },
  { code: 'KR', name: 'South Korea', dial: '+82' },
  { code: 'SG', name: 'Singapore', dial: '+65' },
  { code: 'PH', name: 'Philippines', dial: '+63' },
  { code: 'AU', name: 'Australia', dial: '+61' },
  { code: 'BR', name: 'Brazil', dial: '+55' },
  { code: 'MX', name: 'Mexico', dial: '+52' },
  { code: 'NG', name: 'Nigeria', dial: '+234' },
  { code: 'ZA', name: 'South Africa', dial: '+27' },
  { code: 'EG', name: 'Egypt', dial: '+20' },
]
