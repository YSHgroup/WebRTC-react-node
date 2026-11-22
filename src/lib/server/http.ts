import { NextResponse } from 'next/server'
import type { output, ZodTypeAny } from 'zod'

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message)
  }
}

export const clientIp = (req: Request) =>
  req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'

/** Blocks cross-site form posts. Browsers always send Origin on POST/PATCH/DELETE; non-browser clients have no cookies to abuse. */
function assertSameOrigin(req: Request) {
  const origin = req.headers.get('origin')
  if (!origin) return
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  let originHost = ''
  try { originHost = new URL(origin).host } catch { /* invalid */ }
  if (!host || originHost !== host) throw new HttpError(403, 'Cross-site request blocked.')
}

type Ctx = { params: Record<string, string> }

/**
 * Wraps a route handler: same-origin check on writes, uniform JSON errors, no-store caching.
 * Return a plain object for JSON, or a Response for anything else (images, redirects).
 */
export function handler(fn: (req: Request, ctx: Ctx) => Promise<unknown>) {
  return async (req: Request, ctx: Ctx) => {
    try {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) assertSameOrigin(req)
      const out = await fn(req, ctx)
      if (out instanceof Response) return out
      return NextResponse.json(out ?? { ok: true }, { headers: { 'Cache-Control': 'no-store' } })
    } catch (error) {
      if (error instanceof HttpError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers: { 'Cache-Control': 'no-store' } })
      }
      console.error(`[api] ${req.method} ${new URL(req.url).pathname}`, error)
      const message = error instanceof Error && /DATABASE_URL|AUTH_SECRET|Firebase|Firebase Admin/.test(error.message)
        ? error.message
        : 'Something went wrong on the server. Please try again.'
      return NextResponse.json({ error: message }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
    }
  }
}

export async function parseBody<T extends ZodTypeAny>(req: Request, schema: T): Promise<output<T>> {
  let raw: unknown
  try { raw = await req.json() } catch { throw new HttpError(400, 'Invalid request body.') }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message || 'Invalid request.')
  }
  return parsed.data
}
