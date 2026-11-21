import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

// scrypt ships with Node, so there is no native module to break on Vercel.
const N = 16384
const R = 8
const P = 1
const KEYLEN = 64

function derive(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEYLEN, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key)))
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await derive(password, salt, N, R, P)
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$')
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  // Always do the same amount of work so response time does not reveal whether an account exists.
  if (!stored) {
    await derive(password, Buffer.alloc(16), N, R, P)
    return false
  }
  const [scheme, n, r, p, salt, hash] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'base64')
  const actual = await derive(password, Buffer.from(salt, 'base64'), Number(n), Number(r), Number(p))
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
