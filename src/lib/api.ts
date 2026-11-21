import { useAuth } from '@/store/auth'

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message)
  }
}

interface Options {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  form?: FormData
  signal?: AbortSignal
}

/** Same-origin JSON fetch. Cookies carry the session; errors become readable ApiError messages. */
export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method: opts.method ?? (opts.body || opts.form ? 'POST' : 'GET'),
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.form ?? (opts.body ? JSON.stringify(opts.body) : undefined),
      signal: opts.signal,
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError(0, 'Network error. Check your connection.', 'network')
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string }
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/api/auth/')) useAuth.getState().signedOut()
    if (res.status === 403 && data.code === 'unverified') useAuth.getState().needsVerification()
    throw new ApiError(res.status, data.error ?? 'Request failed.', data.code)
  }
  return data as T
}
