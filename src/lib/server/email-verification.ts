import { issueCode } from './codes'
import { codeEmail, sendMail } from './mail'

export async function sendEmailVerificationCode(uid: string, email: string) {
  const code = await issueCode(uid, 'verify_email')
  await sendMail(email, `${code} is your Huddle verification code`, codeEmail('Verify your email', code), `verification code: ${code}`)
}
