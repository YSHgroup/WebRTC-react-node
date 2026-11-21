import { getSql } from './db'
import { HttpError } from './http'

/**
 * Fixed-window limiter stored in Postgres, so it works across serverless instances.
 * Throws 429 once `max` hits have happened inside `windowMs`.
 */
export async function rateLimit(key: string, max: number, windowMs: number) {
  const sql = getSql()
  const now = Date.now()
  const rows = await sql`
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (${key}, 1, ${now}::bigint)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start < ${now - windowMs}::bigint THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_start < ${now - windowMs}::bigint THEN ${now}::bigint ELSE rate_limits.window_start END
    RETURNING count, window_start`
  const { count, window_start } = rows[0] as { count: number; window_start: string | number }
  if (Math.random() < 0.01) {
    // opportunistic housekeeping so the table never grows
    await sql`DELETE FROM rate_limits WHERE window_start < ${now - 24 * 3600_000}::bigint`
    await sql`DELETE FROM auth_codes WHERE expires_at < ${now}::bigint`
  }
  if (count > max) {
    const wait = Math.max(1, Math.ceil((Number(window_start) + windowMs - now) / 60_000))
    throw new HttpError(429, `Too many attempts. Try again in about ${wait} minute${wait === 1 ? '' : 's'}.`)
  }
}
