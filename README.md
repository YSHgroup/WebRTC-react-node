# Huddle — team chat with video calls (free-tier stack)

Next.js 14 · Neon Postgres (accounts, chats, files) · Firebase Authentication (Google sign-in, phone verification) · Firebase Realtime Database (live delivery) · WebRTC calls · Vercel.

- Register with email or phone plus password, or sign in with Google. Email and phone verification are required; account records are stored in **your** Neon Postgres.
- Private chats and groups (Development, HR Team, Introduction, Partners, Topic-off), emoji, formatting, replies, forwarding, photos and files.
- Left sidebar (profile, search, groups, contacts), right panel (contact or group profile), profile page, peer-to-peer video and voice calls.

**Start here:** [`docs/INSTALLATION.md`](docs/INSTALLATION.md) · What changed and why: [`docs/AUDIT.md`](docs/AUDIT.md)

```
src/app/api/       REST API: auth, bootstrap, conversations, messages, attachments, profile, realtime token, ICE, health
src/lib/server/    database, sessions, passwords, rate limits, mail, Firebase Admin auth
src/lib/realtime/  Firebase Realtime Database transport (inbox, presence, typing, call signals)
src/lib/webrtc/    call manager
db/schema.sql      database schema (applied automatically on build)
database.rules.json  Realtime Database security rules (paste into the Firebase console)
```
