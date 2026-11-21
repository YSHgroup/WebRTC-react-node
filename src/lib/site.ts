/** Canonical site URL. SITE_URL wins; on Vercel the production domain is detected automatically. */
export const SITE_URL =
  process.env.SITE_URL?.replace(/\/$/, '') ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
