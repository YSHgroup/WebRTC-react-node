import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any>

type Sql = NeonQueryFunction<false, false>
let client: Sql | null = null

/** Neon serverless driver over HTTPS — no connection pool to exhaust on Vercel. */
export function getSql(): Sql {
  if (client) return client
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) throw new Error('DATABASE_URL is not set. Connect a Neon database to the Vercel project.')
  client = neon(url)
  return client
}

/** Postgres unique-violation. */
export const isUniqueViolation = (e: unknown) => (e as { code?: string })?.code === '23505'
