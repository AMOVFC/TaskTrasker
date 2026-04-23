import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '../../../../lib/supabase/service-role'
import { resend, FROM_EMAIL } from '../../../../lib/email/resend'
import { launchAnnouncementEmail } from '../../../../lib/email/templates/launch-announcement'

const BATCH_SIZE = 100

export async function POST(request: Request) {
  const secret = request.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!resend) {
    return NextResponse.json({ error: 'Resend is not configured' }, { status: 500 })
  }

  try {
    const supabase = createServiceRoleClient()

    const { data: subscribers, error } = await supabase
      .from('launch_notify_emails')
      .select('id, email')
      .is('unsubscribed_at', null)

    if (error) {
      console.error('blast fetch error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({ sent: 0 })
    }

    const baseUrl = process.env.APP_URL ?? 'https://tasktrasker.com'
    let sent = 0
    let failed = 0

    // Resend batch API accepts up to 100 emails per call
    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const chunk = subscribers.slice(i, i + BATCH_SIZE)
      const batch = chunk.map(({ id, email }) => {
        const unsubscribeUrl = `${baseUrl}/api/launch-notify/unsubscribe?token=${id}`
        const { subject, html, text } = launchAnnouncementEmail(email, unsubscribeUrl)
        return { from: FROM_EMAIL, to: email, subject, html, text }
      })

      const { error: batchError } = await resend.batch.send(batch)
      if (batchError) {
        console.error('blast batch error:', batchError)
        failed += chunk.length
      } else {
        sent += chunk.length
      }
    }

    return NextResponse.json({ sent, failed, total: subscribers.length })
  } catch (err) {
    console.error('blast error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
