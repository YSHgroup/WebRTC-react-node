# Huddle v2 — Installation Guide

Free stack: **Next.js on Vercel** + **Neon Postgres** (data and logins) + **Firebase Realtime Database** (live delivery only).

## How it fits together

| Piece | Job | Where credentials live |
|---|---|---|
| Next.js on Vercel | Pages and API | — |
| Neon Postgres | Users, password hashes, conversations, messages, files | **Here, only here** |
| Firebase Realtime DB | Delivers "new message", typing, online status and call signals instantly | Nothing. Browsers sign in with a token that carries only a user id |

People register and sign in with *this app*. Firebase Authentication is never used to store emails, phone numbers or passwords.

## 1. What you need

- Node.js 20 or newer and Git
- Free accounts: GitHub, Vercel, Firebase (Google account)
- Optional: Google Cloud (Google sign-in), Resend (emails), Cloudflare (TURN relay for calls)

## 2. Put the code in your repo

1. Open your existing repository folder and delete everything **except** the hidden `.git` folder.
2. Copy the contents of the new project into it.
3. Run `npm install`. This creates a fresh `package-lock.json` (the old one is intentionally not included).
4. Commit and push to GitHub.

## 3. Create the database (Neon)

1. In Vercel, create the project first (step 6), then open **Storage** (or **Marketplace**) → **Neon** → create a database. Connect it to the project for all environments.
2. Vercel adds `DATABASE_URL` automatically.
3. Tables are created automatically on every deploy (`npm run build` runs `scripts/migrate.mjs`). Nothing to paste into SQL editors.

## 4. Create the realtime channel (Firebase)

1. Go to the Firebase console → **Add project**. Analytics is not needed.
2. **Build → Realtime Database → Create database.** Choose a region near your users. Start in *locked mode*.
3. Open the **Rules** tab, replace everything with the contents of `database.rules.json`, and **Publish**.
4. Copy the database URL shown at the top of the **Data** tab, for example `https://my-app-default-rtdb.europe-west1.firebasedatabase.app`. This is `FIREBASE_DATABASE_URL`.
5. **Build → Authentication → Get started.** Do not enable any sign-in provider. This only switches on the token service the app uses.
6. **Project settings → General →** copy the **Web API Key** (`FIREBASE_API_KEY`).
7. **Project settings → Service accounts → Generate new private key.** Open the downloaded JSON file, copy its whole content, and use it as `FIREBASE_SERVICE_ACCOUNT` (one line is fine; Vercel accepts pasted JSON).

Console labels move around from time to time; follow the intent if a name differs.

## 5. Generate the session secret

Run `openssl rand -base64 48` (or any password generator, 32+ characters). This is `AUTH_SECRET`. Keep it private. Changing it later signs everyone out.

## 6. Deploy on Vercel

1. **Add New → Project →** import your GitHub repository. Framework is detected as Next.js.
2. Add these **Environment Variables** (Production, and Preview if you use previews):

| Name | Value |
|---|---|
| `AUTH_SECRET` | from step 5 |
| `FIREBASE_SERVICE_ACCOUNT` | JSON from step 4.7 |
| `FIREBASE_DATABASE_URL` | from step 4.4 |
| `FIREBASE_API_KEY` | from step 4.6 |
| `DATABASE_URL` | added by Neon (step 3) |
| `SITE_URL` | `https://YOUR-APP.vercel.app` (the production domain used for canonical links and the sitemap) |

3. In `vercel.json`, set `regions` to the Vercel region closest to your Neon database (for example `iad1` for US East, `fra1` for Frankfurt). Short distance between functions and the database makes everything faster.
4. Click **Deploy**.

## 7. Check it works

1. Open `https://YOUR-APP.vercel.app/api/health`. You want `"database": "ok"`, `"authSecret": true`, `"realtime": true`. The page shows only true/false, never secret values.
2. Register two accounts, one in a normal window and one in a private window.
3. Send messages both ways: they should appear instantly, and typing and green "online" dots should work.
4. Start a video call from one account to the other and allow camera and microphone.

If the first message works but nothing is instant, realtime is misconfigured. The app keeps working by polling every few seconds, and a banner tells you so.

## 8. Optional features

### Google sign-in
1. Google Cloud console → **APIs & Services → Credentials → Create credentials → OAuth client ID**, type **Web application**. Configure the consent screen first if asked.
2. **Authorized redirect URI:** `https://YOUR-DOMAIN/api/auth/google/callback` (also `http://localhost:3000/api/auth/google/callback` for local testing).
3. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to Vercel and redeploy.
4. Preview deployments have different URLs, so Google sign-in works on production and on any preview URL you add explicitly.

### Emails: verification and password reset
1. Create a Resend account and an API key; set `RESEND_API_KEY`.
2. The default sender `onboarding@resend.dev` only delivers to your own Resend account address. Verify a domain in Resend, then set `MAIL_FROM` to an address on it.
3. When emails reach any address, set `REQUIRE_EMAIL_VERIFICATION=true` to force new email accounts to confirm with a 6-digit code. Do not enable it earlier or new users get locked out.

### Phone numbers
Phone numbers work as a sign-in name with a password. Real SMS verification is not free anywhere, so numbers are stored as *unverified*. Anyone could type someone else's number when registering, so do not treat phone numbers as proof of identity.

### Bot protection
Create a reCAPTCHA v3 key for your production domain. Set `RECAPTCHA_SECRET_KEY` and `RECAPTCHA_SITE_KEY` in Vercel. Use the plain `RECAPTCHA_SITE_KEY` name; the app serves this public key to the browser at runtime, so it does not need a `NEXT_PUBLIC_` prefix or a rebuild when changed. Keep `RECAPTCHA_SECRET_KEY` private. reCAPTCHA v3 runs invisibly (it does not show a checkbox); users should see Google's badge and the privacy/terms notice on the sign-in and registration pages.

After deployment, check `/api/health`: `captcha` and `captchaSiteKey` should both be `true`. If only `captcha` is true, the server is requiring verification but the browser cannot generate a token, which causes “Could not confirm you are human.” Add the public site key, confirm its type is v3 and its allowed domains include your production hostname, then redeploy.

### Calls behind strict networks (TURN)
Most calls connect with the built-in STUN servers. Offices, mobile networks and some Wi-Fi need a relay. Use either:
- Cloudflare Realtime TURN: set `CLOUDFLARE_TURN_KEY_ID` and `CLOUDFLARE_TURN_API_TOKEN`. Credentials are created per call.
- Another provider with a free tier: set `TURN_URLS` (comma-separated), `TURN_USERNAME`, `TURN_CREDENTIAL`.

## 9. Run locally

1. Copy `.env.example` to `.env.local` and fill in the same values. `DATABASE_URL` can be the same Neon database (use a separate Neon branch for development if you can).
2. `npm run db:migrate`, then `npm run dev`, then open http://localhost:3000.
3. In development, emails are printed in the terminal instead of being sent.

## 10. Free-plan limits to know about

- **Firebase Spark:** about 100 simultaneous connections, 1 GB stored, 10 GB/month downloaded. In practice roughly 100 people online at once. Check current limits in the Firebase pricing page.
- **Neon free:** about 0.5 GB of storage. Files and photos are stored in the database (3 MB per file, photos shrunk automatically), so heavy file sharing fills it. Move files to object storage if you outgrow it.
- **Vercel Hobby:** limited function time and bandwidth, and the plan is for **personal, non-commercial use**. A company chat is commercial use and needs a paid plan.
- **Calls** are peer to peer. They do not use Vercel or Firebase bandwidth, only the signalling does.
- **Background notifications** (ringing when the tab is closed) are not included; the other person must have the app open.

## 11. Security notes

- Passwords are hashed with scrypt. Sessions are signed, HTTP-only cookies.
- Every API route re-checks the session; the middleware is only a convenience redirect.
- Anyone signed in can see other users' names, photos, emails and phone numbers (a team directory). Set `DIRECTORY_SHOW_CONTACT=false` to hide emails and phones.
- Typing indicators are readable by any signed-in user who knows a conversation id. They contain no message text.
- The default groups are public: everyone is added when they register.

## 12. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| `/api/health` shows `"database": "not-configured"` | Neon is not connected to the project, or `DATABASE_URL` is missing for that environment. Connect it and redeploy. |
| `"database": "schema-missing"` | The build did not run migrations. Run `npm run db:migrate` with the production `DATABASE_URL`, or redeploy. |
| Build fails: "DATABASE_URL is not set" | Add the Neon connection before deploying. |
| Cannot sign in, "AUTH_SECRET" error | Secret missing or shorter than 32 characters. |
| `"realtime": false` | Missing service account, database URL or Web API key. Variables changes need a redeploy. |
| "Realtime is not configured" or sign-in with token fails | Authentication was never switched on (step 4.5), or the service account is from a different project than the database. |
| Messages only appear after a few seconds | Realtime is down and the app is polling. Check the rules were published and the URL has no trailing path. |
| Google error "redirect_uri_mismatch" | The redirect URI in Google Cloud must match exactly `https://YOUR-DOMAIN/api/auth/google/callback`. |
| Registration email never arrives | Resend test sender only reaches your own address. Verify a domain. |
| Call stays on "Connecting…" | Network needs TURN (section 8). Also check the browser has camera and microphone permission. |
| "X is offline" when calling | Calls ring only people who are online. |

## 13. Moving old accounts

Accounts created with the previous Firebase-Auth version are not carried over, because their passwords live in Firebase. For a team that is still testing, ask everyone to register again. If you need to migrate real users, export them with `firebase auth:export` and import the hashes in a one-off script; ask for help with this.
