import { createServiceRoleClient } from '../../../../lib/supabase/service-role'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const html = (title: string, body: string) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>${title}</title></head>
<body style="margin:0;padding:60px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;color:#374151;">
  <h2 style="margin:0 0 12px">${title}</h2>
  <p style="margin:0;color:#6b7280">${body}</p>
</body>
</html>`

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token') ?? ''

  if (!UUID_REGEX.test(token)) {
    return new Response(html('Invalid link', 'This unsubscribe link is not valid.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('launch_notify_emails')
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq('id', token)
      .is('unsubscribed_at', null)

    if (error) {
      console.error('unsubscribe error:', error.message)
      return new Response(html('Something went wrong', 'Please try again later.'), {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      })
    }

    return new Response(
      html("You've been unsubscribed", "We've removed you from the TaskTrasker launch list."),
      { headers: { 'Content-Type': 'text/html' } },
    )
  } catch (err) {
    console.error('unsubscribe config error:', err)
    return new Response(html('Configuration error', 'Unable to process your request.'), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    })
  }
}
