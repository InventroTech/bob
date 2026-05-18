/**
 * Password reset OTP email templates (source of truth in the frontend).
 * Bodies must contain {@link PASSWORD_RESET_OTP_PLACEHOLDER} exactly once;
 * the backend replaces it with the real 6-digit OTP before sending.
 */
export const PASSWORD_RESET_OTP_PLACEHOLDER = '%%PYRO_OTP%%';

/** Keep in sync with backend `OTP_TTL_SECONDS` (300) in `authentication/password_reset.py`. */
export const PASSWORD_RESET_OTP_TTL_MINUTES = 5;

export interface PasswordResetOtpEmailOptions {
  brandName?: string;
  ttlMinutes?: number;
  /** Absolute URL of the reset-password route (typically includes `email` query for convenience). */
  resetLink: string;
}

export function buildPasswordResetOtpEmail(options: PasswordResetOtpEmailOptions): {
  subject: string;
  textBody: string;
  htmlBody: string;
} {
  const brand = options.brandName?.trim() || 'Pyro';
  const ttl = options.ttlMinutes ?? PASSWORD_RESET_OTP_TTL_MINUTES;
  const code = PASSWORD_RESET_OTP_PLACEHOLDER;
  const resetUrl = options.resetLink.trim();
  const resetHref = escapeHtml(resetUrl);

  const subject = `[${brand}] Your password reset code`;

  const textBody = [
    `${brand} password reset`,
    '',
    `Your verification code is: ${code}`,
    '',
    'Open this link to enter your code and choose a new password:',
    resetUrl,
    '',
    `This code expires in ${ttl} minutes. If you did not request a reset, ignore this email.`,
    '',
  ].join('\n');

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#171717;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;">
          <tr>
            <td style="padding:28px 28px 20px;background:#fafafa;border-bottom:1px solid #e4e4e7;">
              <div style="font-size:13px;font-weight:600;color:#52525b;text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(brand)}</div>
              <div style="margin-top:10px;font-size:22px;font-weight:700;color:#09090b;line-height:1.25;">Password reset code</div>
              <div style="margin-top:10px;font-size:15px;line-height:1.5;color:#3f3f46;">Use the button below or open the app and go to the reset page. The code expires in <strong>${ttl} minutes</strong>.</div>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 28px;text-align:center;">
              <div style="font-size:13px;color:#71717a;margin-bottom:8px;">Your code</div>
              <div style="font-size:36px;font-weight:700;letter-spacing:0.35em;font-family:ui-monospace,monospace;color:#09090b;">${code}</div>
              <div style="margin:28px 0 0;">
                <a href="${resetHref}" style="display:inline-block;padding:12px 24px;background:#18181b;color:#fafafa;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">Open reset page</a>
              </div>
              <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#71717a;word-break:break-all;">Or copy this link:<br/><a href="${resetHref}" style="color:#2563eb;">${resetHref}</a></p>
              <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa;">If you did not request this, you can safely ignore this message.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, textBody, htmlBody };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
