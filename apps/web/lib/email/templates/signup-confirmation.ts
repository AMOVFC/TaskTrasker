export function signupConfirmationEmail(
  email: string,
  unsubscribeUrl: string,
): { subject: string; html: string; text: string } {
  return {
    subject: "You're on the TaskTrasker launch list!",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're on the list!</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td>
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">You're on the list!</h1>
              <p style="margin:0 0 24px;font-size:16px;color:#6b7280;">We'll let <strong>${email}</strong> know the moment TaskTrasker launches.</p>
              <p style="margin:0 0 32px;font-size:15px;color:#374151;">TaskTrasker is a task manager built around how you actually think — tree-structured, fast, and distraction-free.</p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                If you didn't sign up for this, <a href="${unsubscribeUrl}" style="color:#9ca3af;">unsubscribe here</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text: `You're on the TaskTrasker launch list!

We'll notify ${email} the moment TaskTrasker launches.

TaskTrasker is a task manager built around how you actually think — tree-structured, fast, and distraction-free.

To unsubscribe: ${unsubscribeUrl}`,
  }
}
