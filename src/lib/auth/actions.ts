import { api, ApiError } from '@/lib/api'
import type { Me } from '@/lib/types'
import { useAuth } from '@/store/auth'

export const authError = (e: unknown) =>
  e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Something went wrong. Please try again.'

type Result = { user: Me }

const apply = (r: Result) => { useAuth.getState().setUser(r.user); return r.user }

export async function registerAccount(input: {
  name: string
  identifier: string
  country: string
  password: string
  captchaToken?: string
  firebaseIdToken?: string
}): Promise<{ user: Me; verificationError?: string }> {
  const result = await api<Result & { verificationError?: string }>('/api/auth/register', { body: input })
  apply(result)
  return result
}

export const loginAccount = (input: { identifier: string; country: string; password: string; captchaToken?: string }) =>
  api<Result>('/api/auth/login', { body: input }).then(apply)

export const loginWithFirebase = (idToken: string) =>
  api<Result>('/api/auth/firebase', { body: { idToken } }).then(apply)

export const sendEmailCode = () => api('/api/auth/email/send', { method: 'POST', body: {} })

export const verifyEmailCode = async (code: string) => {
  const r = await api<Result>('/api/auth/email/verify', { body: { code } })
  apply(r)
}

export async function verifyPhoneAccount(idToken: string) {
  const r = await api<Result>('/api/auth/phone/verify', { body: { idToken } })
  return apply(r)
}

export const requestPasswordReset = (email: string) => api('/api/auth/password/forgot', { body: { email } })

export const resetPassword = (input: { email: string; code: string; password: string }) =>
  api<Result>('/api/auth/password/reset', { body: input }).then(apply)

/** Full page load afterwards, so every store, listener and realtime connection is discarded. */
export async function logout() {
  try { await api('/api/auth/logout', { method: 'POST', body: {} }) } catch { /* cookie may already be gone */ }
  window.location.assign('/login')
}
