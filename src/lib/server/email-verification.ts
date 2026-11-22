import { SITE_URL } from '@/lib/site'
import { issueCode, issueEmailLinkToken } from './codes'
import { codeEmail, sendMail, verificationLinkEmail } from './mail'

export type EmailVerificationMethod = 'code' | 'link'

export async function sendEmailVerification(uid: string, email: string, method: EmailVerificationMethod) {
  if (method === 'code') {
    const code = await issueCode(uid, 'verify_email')
    await sendMail(email, `${code} is your Huddle verification code`, codeEmail('Verify your email', code), `verification code: ${code}`)
    return
  }

  const token = await issueEmailLinkToken(uid)
  const link = new URL('/verify-email', SITE_URL)
  link.searchParams.set('uid', uid)
  link.searchParams.set('token', token)
  await sendMail(
    email,
    'Verify your Huddle email address',
    verificationLinkEmail(link.toString()),
    `verification link: ${link.toString()}`,
  )
}
