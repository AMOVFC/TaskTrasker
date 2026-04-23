export function launchAnnouncementEmail(
  email: string,
  unsubscribeUrl: string,
): { subject: string; html: string; text: string } {
  return {
    subject: 'TaskTrasker is live!',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TaskTrasker is live!</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td>
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">TaskTrasker is live!</h1>
              <p style="margin:0 0 24px;font-size:16px;color:#6b7280;">You signed up to hear about this — it's here.</p>
              <p style="margin:0 0 32px;font-size:15px;color:#374151;">
                TaskTrasker is a task manager built around how you actually think — tree-structured, fast, and distraction-free. Go try it now.
              </p>
              <a href="https://tasktrasker.com" style="display:inline-block;padding:12px 28px;background:#111827;color:#ffffff;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
                Open TaskTrasker
              </a>
              <p style="margin:32px 0 0;font-size:12px;color:#9ca3af;">
                You received this because you signed up at tasktrasker.com with ${email}.<br />
                <a href="${unsubscribeUrl}" style="color:#9ca3af;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text: `TaskTrasker is live!

You signed up to hear about this — it's here.

TaskTrasker is a task manager built around how you actually think — tree-structured, fast, and distraction-free.

Go try it: https://tasktrasker.com

---
You received this because you signed up at tasktrasker.com with ${email}.
To unsubscribe: ${unsubscribeUrl}`,
  }
}
