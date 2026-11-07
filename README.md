# Huddle — Next.js + Firebase + Socket.io chat with WebRTC video calls

Rebuilt from your `WebRTC-react-node` app, following the pastel-purple mockup.
Next.js 14 (App Router) · Tailwind · Firebase Auth + Firestore (free Spark plan) · Socket.io · WebRTC.

## What's inside
- Register / sign in: email + password (6-digit email code), phone (Firebase SMS + libphonenumber-js), Google, reCAPTCHA v3
- Private chats and 5 default groups (Development, HR Team, Introduction, Partners, Topic-off)
- Formatting (bold, italic, underline, strike, code, quote, list), emoji picker + `:)` emoticons, replies, forwarding, photos/files
- Left sidebar (profile, search ⌘K, groups, connected contacts), right panel (contact / group profile with members)
- Profile page, contacts page, P2P video + voice calls (WebRTC), dark mode, mobile layout with bottom tabs
- SEO: metadata, Open Graph image, sitemap, robots, JSON-LD, manifest; the signed-in app is `noindex`

## Setup (about 10 minutes)
1. `npm install`
2. Firebase console → create project (free Spark plan)
   - Authentication → enable **Email/Password**, **Google**, **Phone**; add your domain(s) under Authorized domains
   - Firestore → create database, then publish `firestore.rules` (`firebase deploy --only firestore:rules` or paste in console)
   - Project settings → add a Web app → copy values into `.env.local`; Service accounts → generate key → `FIREBASE_*` vars
3. reCAPTCHA v3 keys: https://www.google.com/recaptcha/admin → `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`
4. Email codes: free Resend account → `RESEND_API_KEY`. (Resend only delivers to your own address until you verify a domain.) Without a key, codes print in the server console in dev.
5. `cp .env.example .env.local`, fill it in, then `npm run dev`

## Realtime: read this before deploying
**Socket.io cannot run on Vercel** — serverless functions don't keep WebSocket connections open. So there are two transports behind one interface (`src/lib/realtime`):

| `NEXT_PUBLIC_REALTIME` | How it works | Where it runs |
|---|---|---|
| `firestore` (default) | Firestore listeners carry messages, typing, presence and call signalling | **Vercel free** ✔ |
| `socket` | Socket.io server verifies Firebase tokens, saves messages, broadcasts, relays call signals | Any long-running Node host |

Socket.io options:
- Local: `npm run dev:socket` with `NEXT_PUBLIC_REALTIME=socket` (Next + Socket.io on one port).
- Production: keep the site on Vercel and run only the socket server on a free Node host (Render/Fly/Railway free tiers vary):
  `SOCKET_ONLY=1 npm run start:socket`, then set on Vercel `NEXT_PUBLIC_REALTIME=socket` and `NEXT_PUBLIC_SOCKET_URL=https://your-socket-host`, and on the socket host `SOCKET_CORS_ORIGINS=https://your-site.vercel.app` plus the `FIREBASE_*` vars.

## Deploy to Vercel
Import the repo, add every variable from `.env.example`, deploy. Add the Vercel domain to Firebase Authorized domains and the reCAPTCHA key's domains.

## Free-tier trade-offs
- **No Firebase Storage** (it now requires the paid Blaze plan). Photos are compressed and stored in Firestore; files are limited to 700 KB; avatars are 256 px.
- Firestore free quota: 50k reads / 20k writes per day. The Firestore transport uses more of it (presence heartbeats every 90 s, typing); the Socket.io transport uses less.
- Phone SMS on Spark has a small daily limit; use Firebase "test phone numbers" while developing.
- Calls use Google STUN. Strict corporate NATs may need a TURN server — set `NEXT_PUBLIC_TURN_*` (Metered.ca has a free tier).
- Any signed-in user can see other users' name, email and phone (matches the mockup's directory). Tighten `users` rules if that's not what you want.
- Contacts are a public directory; groups are public and auto-joined on first sign-in.

## Layout
```
server/            Socket.io server (+ optional Next host)
src/app/           routes: / , /login, /register, /chat, /chat/[cid], /contacts, /profile, /call/[callId], /api/*
src/lib/realtime/  Transport interface, Firestore + Socket.io implementations
src/lib/webrtc/    call manager (signalling over the transport)
src/components/    ui, auth, chat, layout, call
```
