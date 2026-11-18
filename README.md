# Huddle — Next.js + Firebase chat with WebRTC video calls

Next.js 14 (App Router) · Tailwind · Firebase Auth + Firestore · WebRTC.

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
   - Project settings → add a Web app → set its config as `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, and `FIREBASE_APP_ID`. Create a service-account key and set `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` on the server. Use the same Firebase project ID for the web app and service account.
3. Configure reCAPTCHA v3 at https://www.google.com/recaptcha/admin. Add the local and production hostnames, then set `RECAPTCHA_SITE_KEY` and `RECAPTCHA_SECRET_KEY`.
4. Configure Resend and set `RESEND_API_KEY` and `MAIL_FROM`. The default `onboarding@resend.dev` sender is for testing; verify a domain in Resend before using your own sender address in production.
5. Copy `.env.example` to `.env.local`, fill in the values, and set `OTP_SECRET` to a unique random value of at least 32 characters. Then run `npm run dev`.

## Realtime and Vercel
The app uses Firestore listeners for live messages, typing, presence, and WebRTC call signalling. This runs from the browser and does not need a persistent WebSocket process or a separate Node host. Email-code and CAPTCHA verification are Next.js API routes.

Socket.io requires a persistent WebSocket server and cannot be hosted by Vercel's serverless Next.js runtime. It is intentionally not part of this deployment, and there is no `REALTIME=socket` option to accidentally point the Vercel app at a server it cannot run.

## Deploy to Vercel
Import the repo as a Next.js project and add these environment variables in **Vercel → Project → Settings → Environment Variables** before deploying:

- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`
- `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (server only; keep the private key's `\n` sequences or enter it as a multiline value)
- `RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`
- `RESEND_API_KEY`, `MAIL_FROM`, `OTP_SECRET` (at least 32 random characters)
- `SITE_URL` (the canonical HTTPS deployment URL)
- Optional: `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`

The Firebase web app settings, reCAPTCHA site key, and TURN settings are exposed to browser code using a strict allowlist in `next.config.mjs`; set them in Vercel's Production environment (and Preview/Development if needed) and redeploy after changes. These values are public by design. Keep `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `RESEND_API_KEY`, `RECAPTCHA_SECRET_KEY`, and `OTP_SECRET` server-only; they are not included in that allowlist.

Then:
1. Add your Vercel production and preview domains under Firebase Authentication → Authorized domains, and configure the same domains in the reCAPTCHA admin console.
2. Deploy the Firestore security rules with `firebase deploy --only firestore:rules` (or paste `firestore.rules` into the Firebase console). The app cannot authenticate, chat, or signal calls until the rules are published.
3. Check Vercel function logs if an API route fails. The Firebase Admin service account must belong to the same project as the web app and have permission to access Authentication and Firestore.

## Free-tier trade-offs
- **No Firebase Storage** (it now requires the paid Blaze plan). Photos are compressed and stored in Firestore; files are limited to 700 KB; avatars are 256 px.
- Firestore free quota: 50k reads / 20k writes per day. Realtime presence heartbeats and typing updates use this quota.
- Phone SMS on Spark has a small daily limit; use Firebase "test phone numbers" while developing.
- Calls use Google STUN. Strict corporate NATs may need a TURN server. If configured, TURN credentials are sent to browsers; use provider-issued temporary/limited credentials rather than a permanent secret.
- Any signed-in user can see other users' name, email and phone (matches the mockup's directory). Tighten `users` rules if that's not what you want.
- Contacts are a public directory; groups are public and auto-joined on first sign-in.

## Layout
```
src/app/           routes: / , /login, /register, /chat, /chat/[cid], /contacts, /profile, /call/[callId], /api/*
src/lib/realtime/  Firestore realtime for messages, presence, typing, and call signalling
src/lib/webrtc/    call manager (signalling over the transport)
src/components/    ui, auth, chat, layout, call
```
