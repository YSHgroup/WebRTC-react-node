import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    ok: true,
    postgres: {
      configured: Boolean(process.env.POSTGRES_URL),
    },
    firebaseAdmin: {
      projectId: Boolean(process.env.FIREBASE_PROJECT_ID),
      clientEmail: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
      privateKey: Boolean(process.env.FIREBASE_PRIVATE_KEY),
    },
    email: {
      resendConfigured: Boolean(process.env.RESEND_API_KEY),
      otpSecretConfigured: (process.env.OTP_SECRET?.length ?? 0) >= 32,
    },
  })
}
