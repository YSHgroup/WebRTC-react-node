# Huddle — team chat with video calls (free-tier stack)

Next.js 14 · Neon Postgres (accounts, chats, files) · Firebase Realtime Database (live delivery only) · WebRTC calls · Vercel.

- Register and sign in with email or phone plus password, or Google. Credentials are stored in **your** Postgres, never in Firebase.
- Private chats and groups (Development, HR Team, Introduction, Partners, Topic-off), emoji, formatting, replies, forwarding, photos and files.
- Left sidebar (profile, search, groups, contacts), right panel (contact or group profile), profile page, peer-to-peer video and voice calls.

**Start here:** [`docs/INSTALLATION.md`](docs/INSTALLATION.md) · What changed and why: [`docs/AUDIT.md`](docs/AUDIT.md)

```
src/app/api/       REST API: auth, bootstrap, conversations, messages, attachments, profile, realtime token, ICE, health
src/lib/server/    database, sessions, passwords, rate limits, mail, Google OAuth, Firebase Admin
src/lib/realtime/  Firebase Realtime Database transport (inbox, presence, typing, call signals)
src/lib/webrtc/    call manager
db/schema.sql      database schema (applied automatically on build)
database.rules.json  Realtime Database security rules (paste into the Firebase console)
```
