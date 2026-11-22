'use client'

import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  sendEmailVerification as sendFirebaseEmailVerification,
  signInWithPopup,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut,
  onAuthStateChanged,
  reload,
  type Auth,
  type ConfirmationResult,
  type User,
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

export async function createEmailPasswordIdToken(email: string, password: string): Promise<string> {
  const auth = await getFirebaseAuth()
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    return credential.user.getIdToken()
  } catch (error) {
    if ((error as { code?: string }).code !== 'auth/email-already-in-use') throw error
    const credential = await signInWithEmailAndPassword(auth, email, password)
    return credential.user.getIdToken()
  }
}

export async function signInEmailPasswordIdToken(email: string, password: string): Promise<string> {
  const auth = await getFirebaseAuth()
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user.getIdToken()
}

async function getCurrentFirebaseUser(auth: Auth): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser
  return new Promise<User | null>((resolve) => {
    let unsubscribe: (() => void) | null = null
    let resolved = false
    unsubscribe = onAuthStateChanged(auth, (user) => {
      resolved = true
      unsubscribe?.()
      resolve(user)
    })
    if (resolved) unsubscribe()
  })
}

export async function sendFirebaseVerificationLink() {
  const auth = await getFirebaseAuth()
  const user = await getCurrentFirebaseUser(auth)
  if (!user?.email) throw new Error('Sign in to your email account before requesting a verification link.')
  if (user.emailVerified) throw new Error('This email is already verified. Click "I have verified my email" to sync your account.')
  await sendFirebaseEmailVerification(user, {
    url: `${window.location.origin}/verify-email?uid=${encodeURIComponent(user.uid)}`,
  })
}

export async function refreshFirebaseEmailVerificationUid(): Promise<string> {
  const auth = await getFirebaseAuth()
  const user = await getCurrentFirebaseUser(auth)
  if (!user?.email) throw new Error('Sign in to your email account to check verification.')
  await reload(user)
  if (!user.emailVerified) throw new Error('Firebase has not confirmed this email yet. Open the link in your email, then try again.')
  return user.uid
}

export async function signOutFirebase() {
  if (!authPromise) return
  const auth = await authPromise
  await signOut(auth)
}

export function firebaseAuthError(error: unknown): string {
  const code = (error as { code?: unknown })?.code
  if (typeof code === 'string') {
    const messages: Record<string, string> = {
      'auth/operation-not-allowed': 'Enable Email/Password, Google, and Phone sign-in providers in Firebase Authentication.',
      'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
      'auth/weak-password': 'Use at least 8 characters for the password.',
      'auth/invalid-email': 'Enter a valid email address.',
      'auth/invalid-credential': 'Email or password is incorrect.',
      'auth/user-not-found': 'Email or password is incorrect.',
      'auth/wrong-password': 'Email or password is incorrect.',
      'auth/network-request-failed': 'Could not reach Firebase. Check your connection and try again.',
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
