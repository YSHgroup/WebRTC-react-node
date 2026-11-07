/**
 * Long-running Node server: Next.js + Socket.io on the same port.
 *   npm run dev:socket            → local development
 *   npm run start:socket          → any Node host (Render, Railway, Fly.io, a VPS …)
 *   SOCKET_ONLY=1 npm run socket:only → just the Socket.io endpoint, e.g. paired with the site on Vercel
 *
 * NOT usable on Vercel itself: serverless functions cannot hold WebSocket connections.
 */
import { createServer } from 'http'
import { loadEnvConfig } from '@next/env'
import next from 'next'
import { attachSocket } from './socket'

async function main() {
  const dev = process.env.NODE_ENV !== 'production'
  loadEnvConfig(process.cwd(), dev)
  const port = Number(process.env.PORT ?? 3000)

  if (process.env.SOCKET_ONLY) {
    const http = createServer((_req, res) => { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('huddle socket ok') })
    attachSocket(http)
    http.listen(port, () => console.log(`> Socket.io ready on :${port}`))
    return
  }

  const app = next({ dev })
  const handle = app.getRequestHandler()
  await app.prepare()
  const http = createServer((req, res) => handle(req, res))
  attachSocket(http)
  http.listen(port, () => console.log(`> Huddle ready on http://localhost:${port} (Socket.io enabled)`))
}

main().catch((e) => { console.error(e); process.exit(1) })
