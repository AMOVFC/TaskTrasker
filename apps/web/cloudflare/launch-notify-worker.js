/**
 * Cloudflare Worker webhook for TaskTrasker launch notifications.
 *
 * Expected request body from the Next.js API route:
 * {
 *   "email": "person@example.com",
 *   "source": "tasktrasker",
 *   "subscribedAt": "2026-01-01T00:00:00.000Z"
 * }
 *
 * Optional bindings/secrets:
 * - LAUNCH_NOTIFY_KV: KV namespace binding for persistence
 * - LAUNCH_NOTIFY_WEBHOOK_SECRET (recommended) or WEBHOOK_SECRET: bearer auth secret
 */
export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, corsHeaders)
    }

    const webhookSecret = env.LAUNCH_NOTIFY_WEBHOOK_SECRET || env.WEBHOOK_SECRET
    if (webhookSecret) {
      const authHeader = request.headers.get('authorization') || ''
      const expected = `Bearer ${webhookSecret}`
      if (authHeader !== expected) {
        return json({ error: 'Unauthorized' }, 401, corsHeaders)
      }
    }

    let body
    try {
      body = await request.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400, corsHeaders)
    }

    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const source = typeof body?.source === 'string' ? body.source : 'unknown'
    const subscribedAt =
      typeof body?.subscribedAt === 'string' ? body.subscribedAt : new Date().toISOString()

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!EMAIL_REGEX.test(email)) {
      return json({ error: 'Invalid email' }, 400, corsHeaders)
    }

    const record = {
      email,
      source,
      subscribedAt,
      receivedAt: new Date().toISOString(),
      ip: request.headers.get('CF-Connecting-IP') || null,
      userAgent: request.headers.get('User-Agent') || null,
    }

    if (env.LAUNCH_NOTIFY_KV) {
      await env.LAUNCH_NOTIFY_KV.put(`launch:${email}:${Date.now()}`, JSON.stringify(record))
    }

    console.log('launch_notify_signup', record)

    return json({ ok: true }, 200, corsHeaders)
  },
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  })
}
