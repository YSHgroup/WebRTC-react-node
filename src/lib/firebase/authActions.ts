import {
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updateProfile as updateAuthProfile,
  type ConfirmationResult,
  type User,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { upsertProfile } from '@/lib/chat/data'
import { auth, db, googleProvider } from './client'

const MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/user-not-found': 'Email or password is incorrect.',
  'auth/weak-password': 'Use at least 6 characters for the password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/invalid-phone-number': 'Enter a valid phone number including the country.',
  'auth/invalid-verification-code': 'That code is incorrect.',
  'auth/code-expired': 'That code expired. Request a new one.',
  'auth/popup-closed-by-user': 'The Google window was closed before finishing.',
  'auth/popup-blocked': 'Your browser blocked the Google pop-up. Allow pop-ups and retry.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/quota-exceeded': 'SMS limit reached for today. Try email instead.',
  'auth/billing-not-enabled': 'Phone SMS verification requires Firebase Blaze billing. Use email verification or enable billing.',
}

export function authError(e: unknown): string {
  const code = (e as { code?: string })?.code
  const rawMessage = e instanceof Error ? e.message : ''
  if (rawMessage.includes('BILLING_NOT_ENABLED')) {
    return MESSAGES['auth/billing-not-enabled']
  }
  if (code && MESSAGES[code]) return MESSAGES[code]
  if (rawMessage && !code) return rawMessage
  return 'Something went wrong. Please try again.'
}

export async function registerWithEmail(name: string, email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateAuthProfile(cred.user, { displayName: name })
  await upsertProfile(cred.user, { displayName: name })
  return cred.user
}

export const loginWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password).then((c) => c.user)

export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email)

async function otpFetch(path: string, user: User, body?: unknown) {
  const token = await user.getIdToken()
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body ?? {}),
  })
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(data.error ?? 'Request failed')
}

export const sendEmailCode = (user: User) => otpFetch('/api/otp/send', user)

export async function verifyEmailCode(user: User, code: string) {
  await otpFetch('/api/otp/verify', user, { code })
  await user.reload()
  await user.getIdToken(true)
}

export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider)
  await upsertProfile(cred.user)
  return cred.user
}

let verifier: RecaptchaVerifier | null = null

function getVerifier() {
  if (verifier) return verifier
  let el = document.getElementById('recaptcha-container')
  if (!el) {
    el = document.createElement('div')
    el.id = 'recaptcha-container'
    document.body.appendChild(el)
  }
  verifier = new RecaptchaVerifier(auth, el, { size: 'invisible' })
  return verifier
}

export async function sendPhoneCode(e164: string): Promise<ConfirmationResult> {
  try {
    return await signInWithPhoneNumber(auth, e164, getVerifier())
  } catch (e) {
    verifier?.clear()
    verifier = null
    throw e
  }
}

export async function confirmPhoneCode(result: ConfirmationResult, code: string, name?: string) {
  const cred = await result.confirm(code)
  if (name && !cred.user.displayName) await updateAuthProfile(cred.user, { displayName: name })
  await upsertProfile(cred.user, name ? { displayName: name, phone: cred.user.phoneNumber } : {})
  return cred.user
}

export async function logout() {
  const uid = auth.currentUser?.uid
  if (uid) await setDoc(doc(db, 'users', uid), { online: false, lastSeen: Date.now() }, { merge: true }).catch(() => {})
  await signOut(auth)
}
