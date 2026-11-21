import { api, ApiError } from '@/lib/api'
import type { Me } from '@/lib/types'
import { useAuth } from '@/store/auth'

export const authError = (e: unknown) =>
  e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Something went wrong. Please try again.'

type Result = { user: Me }

const apply = (r: Result) => { useAuth.getState().setUser(r.user); return r.user }

export const registerAccount = (input: { name: string; identifier: string; country: string; password: string; captchaToken?: string }) =>
  api<Result>('/api/auth/register', { body: input }).then(apply)

export const loginAccount = (input: { identifier: string; country: string; password: string; captchaToken?: string }) =>
  api<Result>('/api/auth/login', { body: input }).then(apply)

export const sendEmailCode = () => api('/api/auth/email/send', { method: 'POST', body: {} })

export const verifyEmailCode = async (code: string) => {
  await api('/api/auth/email/verify', { body: { code } })
  const r = await api<{ user: Me | null }>('/api/auth/me')
  useAuth.getState().setUser(r.user)
}

export const requestPasswordReset = (email: string) => api('/api/auth/password/forgot', { body: { email } })

export const resetPassword = (input: { email: string; code: string; password: string }) =>
  api<Result>('/api/auth/password/reset', { body: input }).then(apply)

/** Full page load afterwards, so every store, listener and realtime connection is discarded. */
export async function logout() {
  try { await api('/api/auth/logout', { method: 'POST', body: {} }) } catch { /* cookie may already be gone */ }
  window.location.assign('/login')
}
