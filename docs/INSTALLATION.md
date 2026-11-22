# Huddle v2 — Installation Guide

Free stack: **Next.js on Vercel** + **Neon Postgres** (application data and accounts) + **Firebase Authentication** (Google sign-in and phone verification) + **Firebase Realtime Database** (live delivery).

## How it fits together

| Piece | Job | Where credentials live |
|---|---|---|
| Next.js on Vercel | Pages and API | — |
| Neon Postgres | Users, password hashes, conversations, messages, files | **Here, only here** |
| Firebase Authentication | Email/password accounts, Google sign-in, and SMS phone verification; identities are synced to Neon | Sign-in identities and verification status |
| Firebase Realtime DB | Delivers new messages, typing, online status and call signals instantly | No messages or contact details |

Account profiles and the app's user directory are stored in Neon. Firebase Auth stores email/password credentials, handles Google sign-in and phone-number SMS verification, and sends email verification links.

## 1. What you need

- Node.js 20 or newer and Git
- Free accounts: GitHub, Vercel, Firebase (Google account)
- Optional: Resend (email codes and password-reset codes), Cloudflare (TURN relay for calls)

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
5. **Build → Authentication → Get started → Sign-in method.** Enable **Email/Password**, **Google**, and **Phone** providers. Add your production hostname (for example `YOUR-APP.vercel.app`) under **Settings → Authorized domains**. Phone Authentication uses Firebase's SMS service and its reCAPTCHA challenge.
6. **Project settings → General →** copy the **Web API Key** (`FIREBASE_API_KEY`) and the **App ID** for your Web app (`FIREBASE_APP_ID`). If there is no Web app, register one in project settings.
7. **Project settings → Service accounts → Generate new private key.** Open the downloaded JSON file, copy its whole content, and use it as `FIREBASE_SERVICE_ACCOUNT` (one line is fine; Vercel accepts pasted JSON). The service-account `project_id` is detected automatically.

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
| `FIREBASE_APP_ID` | from step 4.6 |
| `DATABASE_URL` | added by Neon (step 3) |
| `SITE_URL` | `https://YOUR-APP.vercel.app` (the production domain used for canonical links and the sitemap) |
| `RESEND_API_KEY` | transactional email verification codes |
| `REQUIRE_EMAIL_VERIFICATION` | `true` (the default) |

3. In `vercel.json`, set `regions` to the Vercel region closest to your Neon database (for example `iad1` for US East, `fra1` for Frankfurt). Short distance between functions and the database makes everything faster.
4. Click **Deploy**.

## 7. Check it works

1. Open `https://YOUR-APP.vercel.app/api/health`. You want `"database": "ok"`, `"authSecret": true`, `"realtime": true`, `"firebaseAuth": true`, `"emailDelivery": true`, and `"emailVerificationRequired": true`. The page shows only true/false, never secret values.
2. Register two accounts, one in a normal window and one in a private window.
3. Send messages both ways: they should appear instantly, and typing and green "online" dots should work.
4. Start a video call from one account to the other and allow camera and microphone.

If the first message works but nothing is instant, realtime is misconfigured. The app keeps working by polling every few seconds, and a banner tells you so.

## 8. Email, bot protection, and calls

### Firebase sign-in and phone verification
Enable Email/Password, Google, and Phone in **Firebase Authentication → Sign-in method**, and add each deployment hostname under **Authorized domains**. Set `FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_API_KEY`, and `FIREBASE_APP_ID` in Vercel. Email/password and Google identities are stored in Firebase Auth and synced with the Neon user record. Google accounts use Google's verified-email claim; password accounts can verify by a Firebase email link or a Resend code. No separate Google OAuth client secret is needed.

Phone sign-up and verification use Firebase Phone Authentication. A user must enter the SMS code before a phone account is created in Neon. SMS quotas, billing requirements, and availability depend on Firebase and the user's region; test with Firebase's configured test phone numbers before launch.

### Emails: verification links, codes, and password reset
1. Create a Resend account and an API key; set `RESEND_API_KEY`.
2. Resend sends verification and reset codes. Its default sender `onboarding@resend.dev` only delivers to your own Resend account address; verify a domain and set `MAIL_FROM` to send codes to other recipients. Firebase sends verification links using its configured Auth email template.
3. Email verification is enabled by default. During email/password registration, users can choose a 6-digit code sent through Resend or a verification link sent by Firebase. Codes expire after 10 minutes; Firebase controls link expiration. Accounts remain restricted until verified. Unverified users can switch methods and request another email. Google accounts use Google's verified-email claim instead.

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
| `"firebaseAuth": false` | Check `FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_API_KEY`, and `FIREBASE_APP_ID`; all must come from the same Firebase project. |
| Firebase says `auth/operation-not-allowed` | Enable Email/Password, Google, and Phone under Firebase Authentication → Sign-in method. |
| Firebase says `auth/unauthorized-domain` | Add the exact Vercel production hostname to Firebase Authentication → Settings → Authorized domains. |
| Phone verification SMS is not delivered | Check the Phone provider, allowed domain, SMS quota/region, and Firebase billing; test with a Firebase test phone number. |
| "Realtime is not configured" or sign-in with token fails | Check the service account and database URL, and ensure the service account belongs to the Firebase project hosting Realtime Database. |
| Messages only appear after a few seconds | Realtime is down and the app is polling. Check the rules were published and the URL has no trailing path. |
| Firebase verification link never arrives | Confirm Email/Password is enabled, your production hostname is in Authorized domains, and the Firebase email template is enabled. |
| Resend verification code never arrives | Resend's test sender only reaches your own Resend account email. Verify a sending domain and set `MAIL_FROM` to use codes for other recipients. |
| Call stays on "Connecting…" | Network needs TURN (section 8). Also check the browser has camera and microphone permission. |
| "X is offline" when calling | Calls ring only people who are online. |

## 13. Existing accounts

Email/password accounts already in Neon remain in place. Existing Google accounts can be linked on Firebase sign-in when the verified Google email matches the Neon account. Phone accounts must complete SMS verification before access is granted. The deployment build applies the new Firebase identity columns automatically.
