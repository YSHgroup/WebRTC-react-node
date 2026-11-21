import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'
import { HttpError } from './http'

/** Turns what someone typed into either a normalised email or an E.164 phone number. */
export function parseIdentifier(raw: string, country?: string): { email: string } | { phone: string } {
  const value = raw.trim()
  if (value.includes('@')) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 254) throw new HttpError(400, 'Enter a valid email address.')
    return { email: value.toLowerCase() }
  }
  const phone = parsePhoneNumberFromString(value, (country as CountryCode) || 'US')
  if (!phone || !phone.isValid()) throw new HttpError(400, 'Enter a valid phone number including the country code (for example +44…).')
  return { phone: phone.number }
}
