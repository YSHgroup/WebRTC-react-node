import { handler } from '@/lib/server/http'
import { requireUser } from '@/lib/server/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ICE servers for calls. STUN works for most home/office networks; TURN relays media for strict NATs.
 * TURN credentials are only handed to signed-in people and are never baked into the JavaScript bundle.
 */
export const GET = handler(async () => {
  await requireUser()
  const iceServers: { urls: string | string[]; username?: string; credential?: string }[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ]

  // Option A: Cloudflare Realtime TURN — mints short-lived credentials per call (recommended).
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID
  const token = process.env.CLOUDFLARE_TURN_API_TOKEN
  if (keyId && token) {
    try {
      const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: 3600 }),
      })
      if (res.ok) {
        const data = (await res.json()) as { iceServers?: { urls: string[]; username: string; credential: string } }
        if (data.iceServers) iceServers.push(data.iceServers)
      } else console.error('[ice] Cloudflare TURN returned', res.status)
    } catch (error) {
      console.error('[ice] Cloudflare TURN failed', error)
    }
  }

  // Option B: any static TURN account (for example Metered). Use the provider's limited credentials.
  const urls = process.env.TURN_URLS?.split(',').map((u) => u.trim()).filter(Boolean)
  if (urls?.length && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    iceServers.push({ urls, username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL })
  }
  return { iceServers }
})
