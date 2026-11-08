/** @type {import('next').NextConfig} */
// Vercel won't let this project use the NEXT_PUBLIC_ prefix, so the values the browser needs are
// listed here and inlined at build time. Do NOT add secrets (private key, secret keys, API keys) to this list.
const clientEnv = [
  'FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID', 'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_APP_ID', 'RECAPTCHA_SITE_KEY', 'REALTIME', 'SOCKET_URL',
  'SITE_URL', 'TURN_URL', 'TURN_USERNAME', 'TURN_CREDENTIAL',
]

const nextConfig = {
  env: Object.fromEntries(clientEnv.map((k) => [k, process.env[k] ?? ''])),
  reactStrictMode: true,
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: 'https', hostname: 'lh3.googleusercontent.com' }] },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // camera/mic are required for video calls
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
        ],
      },
    ]
  },
}
export default nextConfig
