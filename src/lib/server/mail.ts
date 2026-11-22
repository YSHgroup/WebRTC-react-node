import { HttpError } from './http'

/** Sends a plain transactional email through Resend (free tier). In development without a key it prints to the terminal. */
export async function sendMail(to: string, subject: string, html: string, devLog: string) {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    if (process.env.NODE_ENV === 'production') throw new HttpError(503, 'Email delivery is not configured on the server.')
    console.log(`\n[huddle:dev-mail] to=${to}\n${devLog}\n`)
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM ?? 'Huddle <onboarding@resend.dev>', to, subject, html }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error('[mail] Resend rejected the message', res.status, detail)
    throw new HttpError(502, 'Could not send the email. If you use the Resend test sender, it only delivers to your own Resend account email until you verify a domain.')
  }
}

export const codeEmail = (heading: string, code: string) =>
  `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:auto;padding:24px">
    <h2 style="margin:0 0 8px">${heading}</h2>
    <p style="color:#555">Enter this code in Huddle. It expires in 10 minutes.</p>
    <p style="font-size:34px;letter-spacing:8px;font-weight:700;color:#5B35F0;margin:16px 0">${code}</p>
    <p style="color:#888;font-size:12px">If you did not request this, you can ignore this email.</p></div>`

export const verificationLinkEmail = (link: string) => {
  const safeLink = link.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  return `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:auto;padding:24px">
    <h2 style="margin:0 0 8px">Verify your email</h2>
    <p style="color:#555">Click the button below to verify your Huddle account. This link expires in 10 minutes.</p>
    <p style="margin:24px 0"><a href="${safeLink}" style="background:#5B35F0;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Verify email</a></p>
    <p style="color:#555;font-size:12px">If the button doesn’t work, open this link:<br><a href="${safeLink}">${safeLink}</a></p>
    <p style="color:#888;font-size:12px">If you did not create this account, you can ignore this email.</p></div>`
}
