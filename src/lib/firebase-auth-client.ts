'use client'

import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPopup,
  signInWithPhoneNumber,
  type Auth,
  type ConfirmationResult,
} from 'firebase/auth'

interface FirebaseWebConfig {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
}

let authPromise: Promise<Auth> | null = null

export function getFirebaseAuth(): Promise<Auth> {
  if (!authPromise) {
    authPromise = fetch('/api/auth/firebase/config', { cache: 'no-store' })
      .then(async (res) => {
        const data = (await res.json()) as FirebaseWebConfig | { error?: string }
        if (!res.ok) throw new Error('error' in data ? data.error || 'Firebase Authentication is not configured.' : 'Firebase Authentication is not configured.')
        const config = data as FirebaseWebConfig
        const app = getApps().some((entry) => entry.name === 'huddle-auth')
          ? getApp('huddle-auth')
          : initializeApp(config, 'huddle-auth')
        return getAuth(app)
      })
      .catch((error: unknown) => {
        authPromise = null
        throw error
      })
  }
  return authPromise
}

export async function googleFirebaseIdToken(): Promise<string> {
  const auth = await getFirebaseAuth()
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const credential = await signInWithPopup(auth, provider)
  return credential.user.getIdToken()
}

export function firebaseAuthError(error: unknown): string {
  const code = (error as { code?: unknown })?.code
  if (typeof code === 'string') {
    const messages: Record<string, string> = {
      'auth/operation-not-allowed': 'Enable Google and Phone sign-in providers in Firebase Authentication.',
      'auth/unauthorized-domain': 'Add this site to Firebase Authentication’s authorized domains.',
      'auth/popup-blocked': 'Allow pop-ups for this site and try Google sign-in again.',
      'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
      'auth/cancelled-popup-request': 'Another sign-in window is already open.',
      'auth/invalid-phone-number': 'Enter a valid phone number, including its country code.',
      'auth/missing-phone-number': 'Enter a phone number before requesting a code.',
      'auth/too-many-requests': 'Too many verification attempts. Please wait and try again.',
      'auth/quota-exceeded': 'Firebase has reached its SMS quota. Try again later.',
      'auth/billing-not-enabled': 'Enable billing for Firebase Phone Authentication to send SMS codes.',
      'auth/captcha-check-failed': 'Phone verification could not pass Google’s security check. Reload and try again.',
      'auth/invalid-verification-code': 'That verification code is incorrect. Try again.',
      'auth/code-expired': 'That verification code expired. Request a new one.',
    }
    if (messages[code]) return messages[code]
  }
  return error instanceof Error ? error.message : 'Firebase sign-in failed. Please try again.'
}

export async function requestPhoneCode(phone: string, container: HTMLElement): Promise<{
  confirmation: ConfirmationResult
  clear: () => void
}> {
  const auth = await getFirebaseAuth()
  const verifier = new RecaptchaVerifier(auth, container, { size: 'invisible' })
  try {
    return {
      confirmation: await signInWithPhoneNumber(auth, phone, verifier),
      clear: () => verifier.clear(),
    }
  } catch (error) {
    verifier.clear()
    throw error
  }
}
