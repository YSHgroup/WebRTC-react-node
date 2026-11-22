# Huddle — Free Team Chat and Browser Video Calls

Huddle is a browser-based team messaging app for private conversations and group chat, with peer-to-peer video and voice calls built in. Share files, reply to messages, and keep up with your team in one workspace—without installing a desktop app.

**[Open Huddle](https://chat-yshgroup.vercel.app)** · **[Deployment and installation guide](docs/INSTALLATION.md)** · **[Project audit notes](docs/AUDIT.md)**

## What you can do

- **Chat with people or groups:** private conversations, team channels, emoji, message formatting, replies, and forwarding.
- **Start a browser video call:** place peer-to-peer video or voice calls from a conversation using WebRTC.
- **Share photos and files:** send attachments in chat and view them from the conversation.
- **See what’s happening:** realtime message delivery, online presence, typing indicators, and call signaling, with polling as a fallback.
- **Choose how to sign in:** register with an email address and password, register with a phone number and password after SMS verification, or sign in with Google.
- **Verify accounts:** email/password accounts use a six-digit email code; Google email addresses are accepted when Google reports them as verified.

## How Huddle works

Huddle uses separate services for durable app data, identity checks, and realtime delivery:

| Service | Responsibility |
| --- | --- |
| **Next.js on Vercel** | Web application and API |
| **Neon Postgres** | User profiles, account records, conversations, messages, attachments, and verification codes |
| **Firebase Authentication** | Google sign-in and SMS phone verification; verified identities are synced to Neon |
| **Firebase Realtime Database** | Lightweight message notifications, presence, typing, and call signaling—not the message archive |
| **WebRTC** | Peer-to-peer audio and video calls |
| **Resend** | Email verification and password-reset codes |

The database remains the source of truth for Huddle accounts and chat data. Firebase Authentication verifies Google and phone identities; it does not replace Neon as the app’s user directory or chat database.

## Run locally

### Requirements

- Node.js 20 or newer
- A Neon Postgres database
- A Firebase project with Authentication enabled; Realtime Database is needed for live delivery
- A Resend API key to receive email verification and password-reset codes outside local development

### Start the app

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and configure the required database, session, and Firebase settings. See the [installation guide](docs/INSTALLATION.md) for where to find each value.

3. Apply the database schema and start the development server:

   ```bash
   npm run db:migrate
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

In development, verification emails are printed in the terminal if Resend is not configured. Firebase sign-in still requires a configured Firebase project and enabled providers.

## Deploy to Vercel

Import the repository into Vercel, connect Neon, and add the Firebase, email, and app environment variables described in the [deployment guide](docs/INSTALLATION.md). The production build runs the idempotent Neon schema migration before building the Next.js app:

```bash
npm run build
```

After deployment, check `/api/health` on your site to confirm the database, Firebase Authentication, realtime delivery, and email delivery configuration.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Apply the Neon schema and build for production |
| `npm start` | Run the production server |
| `npm run db:migrate` | Apply the database schema |
| `npm run typecheck` | Check TypeScript types |
| `npm run lint` | Run Next.js lint checks |

## Project structure

```text
src/app/             Pages, layouts, and API routes
src/components/      Chat, account, and shared interface components
src/lib/auth/        Browser-side account actions
src/lib/server/      Neon queries, sessions, verification, and Firebase Admin
src/lib/realtime/    Firebase Realtime Database transport
src/lib/webrtc/      Browser peer-to-peer calling
db/schema.sql        Idempotent Neon schema
database.rules.json  Firebase Realtime Database security rules
docs/INSTALLATION.md Full setup, deployment, and troubleshooting guide
```

## Security and deployment notes

- Keep `AUTH_SECRET`, `RECAPTCHA_SECRET_KEY`, Resend credentials, and Firebase service-account credentials in server-side environment variables. `RECAPTCHA_SITE_KEY` is a public key; the app serves it to the browser at runtime. Never commit secrets.
- Add each deployed hostname to Firebase Authentication’s authorized domains, and enable the Google and Phone sign-in providers.
- Email verification requires `RESEND_API_KEY`; SMS verification is subject to Firebase phone-auth quotas, region availability, and billing requirements.
- Huddle uses signed HTTP-only session cookies and rate limits sensitive account actions. Review the [installation guide](docs/INSTALLATION.md) for production configuration and the [audit notes](docs/AUDIT.md) for known limitations.
