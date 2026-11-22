# Audit of the original code and what changed

## Why it did not work on Vercel
1. **Two sources of truth.** Logins lived in Firebase Auth, chats in Firestore, and a half-finished copy in Postgres. The Postgres chat tables and the `/api/conversations` and `/api/messages` routes were never used by the UI.
2. **Build-time configuration.** Firebase settings were read at build time, and `client.ts` threw an error while loading if any were missing. One missing variable broke every page. Changing a value needed a rebuild.
3. **Phone sign-in could not work on the free plan.** It needs Firebase Blaze billing. Registration and login by phone were blocked in the UI.
4. **Email verification.** Firebase email/password credentials are now created before the Neon profile. Users can choose a Firebase verification link (no custom sender domain required) or a Resend code; Resend's test sender still only delivers to the account owner.
5. **Firestore quota exhaustion.** Every ICE candidate in a call was a write, a read and a delete. Presence heartbeats updated every user document, which re-sent that document to every open client. The free quota (20k writes/day) disappears quickly.
6. **Firestore reads of all users on every client**, including a profile photo stored as a data URL in each user document.
7. **Deprecated database package** (`@vercel/postgres`).
8. **Call setup.** STUN only, TURN credentials baked into the browser bundle, no handling of temporary disconnects, silent failures when signalling failed, and calls placed to offline people that just rang for 45 seconds.

## Security findings
- Captcha was verified in a separate request from the login, so it could be skipped by calling Firebase directly.
- Any signed-in user could read every user's email and phone through Firestore rules.
- The first user to sign up could create the default groups and become their admin.
- Any user could create a DM that forced two other people into a conversation.
- Account pre-hijacking risk: someone registering a victim's email first could keep a working password after the victim signs in with Google. Fixed: linking to an unverified account clears the old password.
- Passwords minimum was 6 characters; now 8.
- No rate limiting. Now Postgres-backed limits on register, login, codes, uploads and messages.

## New design
- **Neon Postgres is the source of truth for app profiles and messages.** Firebase Authentication stores email/password credentials and Google/phone identities.
- **Own sessions:** signed HTTP-only cookie; Firebase ID tokens are verified server-side for email/password and Google sign-in.
- **Firebase Realtime Database as a pipe:** per-user private inbox, presence with server-side disconnect handling, typing, call signalling. The browser logs in with a custom token containing only the user id.
- **Graceful fallback:** if realtime is down, the app polls and tells the user.
- **Runtime configuration:** Firebase web config comes from the server at runtime. No rebuild needed.
- **Health page** at `/api/health` and automatic database migration on deploy.
- **Reliability:** idempotent message ids (retries never duplicate), catch-up after reconnect, server-side unread counts, server-rebuilt reply previews, avatars and files served as cached images instead of inline data.

## Not verified
This environment had no internet access, so `npm install`, `next build` and a live run were not possible. The code was syntax-checked and type-checked as far as possible offline. Expect to fix small typing or version issues on the first `npm run build`.
