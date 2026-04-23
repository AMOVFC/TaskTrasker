import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '../../../lib/supabase/server'
import { resend, FROM_EMAIL } from '../../../lib/email/resend'
import { signupConfirmationEmail } from '../../../lib/email/templates/signup-confirmation'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('launch_notify_emails')
      .insert({ email })
      .select('id')
      .single()

    if (error) {
      // Unique violation — already signed up
      if (error.code === '23505') {
        return NextResponse.json({ success: true })
      }
      console.error('launch-notify insert error:', error.message)
      return NextResponse.json(
        { error: 'Unable to save your email right now. Please try again.' },
        { status: 502 },
      )
    }

    // Send confirmation email — non-blocking; a failure here doesn't break signup
    if (resend && data?.id) {
      const headersList = await headers()
      const host = headersList.get('host') ?? ''
      const proto = host.startsWith('localhost') ? 'http' : 'https'
      const baseUrl = process.env.APP_URL ?? `${proto}://${host}`
      const unsubscribeUrl = `${baseUrl}/api/launch-notify/unsubscribe?token=${data.id}`

      const { subject, html, text } = signupConfirmationEmail(email, unsubscribeUrl)
      resend.emails
        .send({ from: FROM_EMAIL, to: email, subject, html, text })
        .catch((err: unknown) => console.error('resend send error:', err))
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 })
  }
}
