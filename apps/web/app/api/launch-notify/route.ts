import { NextResponse } from 'next/server'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function forwardToWebhook(email: string) {
  const webhookUrl = process.env.LAUNCH_NOTIFY_WEBHOOK_URL

  if (!webhookUrl) {
    return { ok: false, reason: 'missing_webhook' as const }
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.LAUNCH_NOTIFY_WEBHOOK_SECRET
        ? { Authorization: `Bearer ${process.env.LAUNCH_NOTIFY_WEBHOOK_SECRET}` }
        : {}),
    },
    body: JSON.stringify({
      email,
      source: 'tasktasker-web',
      subscribedAt: new Date().toISOString(),
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    return { ok: false, reason: 'webhook_failed' as const }
  }

  return { ok: true as const }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 })
    }

    const result = await forwardToWebhook(email)

    if (!result.ok && result.reason === 'missing_webhook') {
      return NextResponse.json(
        {
          error:
            'Launch notifications are not configured yet. Set LAUNCH_NOTIFY_WEBHOOK_URL on the server.',
        },
        { status: 503 },
      )
    }

    if (!result.ok) {
      return NextResponse.json({ error: 'Unable to save your email right now. Please try again.' }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 })
  }
}
