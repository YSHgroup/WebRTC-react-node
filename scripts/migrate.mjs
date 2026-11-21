// Applies db/schema.sql to the database in DATABASE_URL. Safe to run repeatedly.
// Runs automatically before `next build` (see package.json) and can be run by hand: npm run db:migrate
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
if (!url) {
  if (process.env.VERCEL) {
    console.error('[migrate] DATABASE_URL is not set. Connect a Neon database to this Vercel project, then redeploy.')
    process.exit(1)
  }
  console.warn('[migrate] DATABASE_URL is not set — skipping database migration.')
  process.exit(0)
}

const sql = neon(url)
const file = new URL('../db/schema.sql', import.meta.url)
const statements = readFileSync(file, 'utf8')
  .split(/;\s*(?:\r?\n|$)/)
  .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean)

for (const statement of statements) {
  try {
    await sql.query(statement)
  } catch (error) {
    console.error('[migrate] failed on statement:\n' + statement.slice(0, 200) + '\n', error)
    process.exit(1)
  }
}
console.log(`[migrate] applied ${statements.length} statements`)
