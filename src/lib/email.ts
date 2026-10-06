import { Resend } from "resend";

const resendFrom = process.env.RESEND_FROM_EMAIL || "UpJob <onboarding@resend.dev>";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

const APP_NAME = "UpJob";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, text, replyTo }: SendEmailArgs) {
  const resend = getResend();
  if (!resend) {
    // In development, log instead of failing so the flow is testable offline.
    // In production this MUST be a failure: reporting a code as "sent" when it
    // was dropped on the floor leaves the user locked out with no error and no
    // way to tell whether the code was wrong or simply never arrived.
    const message = "RESEND_API_KEY is not configured, so the email was not delivered";
    if (process.env.NODE_ENV === "production") {
      console.error(`[email] ${message} (to: ${to}, subject: ${subject})`);
      return { ok: false, error: message };
    }
    console.info(`[email] Would send to ${to}: ${subject}`);
    return { ok: true, skipped: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: resendFrom,
      to,
      subject,
      html,
      text: text ?? undefined,
      replyTo: replyTo || undefined,
    });
    if (error) {
      console.error(`[email] Resend error for ${to}:`, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error(`[email] Failed to send to ${to}:`, err);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

function layout(contentHtml: string): string {
  return `<!DOCTYPE html>
<html dir="ltr" lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${APP_NAME}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
            <tr>
              <td style="padding:28px 32px 8px;">
                <p style="margin:0;font-size:20px;font-weight:700;color:#18181b;">
                  Up<span style="color:#2563eb;">Job</span>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 8px;font-size:15px;line-height:1.6;color:#3f3f46;">
                ${contentHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 28px;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#a1a1aa;">
                  You're receiving this email because you have an account on ${APP_NAME}.
                  <br />
                  <a href="${APP_URL}" style="color:#2563eb;text-decoration:none;">${APP_URL}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function passwordResetEmail(name: string, resetUrl: string): { subject: string; html: string; text: string } {
  const subject = "Reset your UpJob password";
  const html = layout(`
    <h1 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#18181b;">Reset your password</h1>
    <p style="margin:0 0 16px;">Hi ${escapeHtml(name || "there")},</p>
    <p style="margin:0 0 20px;">We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
    <p style="margin:0 0 24px;text-align:center;">
      <a href="${resetUrl}" style="display:inline-block;background-color:#18181b;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:10px;">Reset password</a>
    </p>
    <p style="margin:0 0 8px;">If you didn't request this, you can safely ignore this email.</p>
    <p style="margin:0;font-size:13px;color:#71717a;">Or copy and paste this link into your browser:</p>
    <p style="margin:0;font-size:13px;color:#2563eb;word-break:break-all;">${resetUrl}</p>
  `);
  const text = `Reset your UpJob password

Hi ${name || "there"},

We received a request to reset your password. Open the link below to choose a new one. It expires in 1 hour.

${resetUrl}

If you didn't request this, you can safely ignore this email.`;
  return { subject, html, text };
}

export function otpEmail({
  name,
  code,
  expiresInMinutes,
}: {
  name: string;
  code: string;
  expiresInMinutes: number;
}): { subject: string; html: string; text: string } {
  const subject = `${code} is your UpJob verification code`;
  const html = layout(`
    <h1 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#18181b;">Your verification code</h1>
    <p style="margin:0 0 16px;">Hi ${escapeHtml(name || "there")},</p>
    <p style="margin:0 0 20px;">Use this code to finish signing in to your UpJob account. It expires in ${expiresInMinutes} minutes and can only be used once.</p>
    <p style="margin:0 0 24px;text-align:center;">
      <span style="display:inline-block;letter-spacing:8px;font-size:30px;font-weight:700;color:#18181b;background-color:#f4f4f5;border:1px solid #e4e4e7;border-radius:12px;padding:16px 24px;">${escapeHtml(code)}</span>
    </p>
    <p style="margin:0 0 8px;">If this wasn't you, don't share the code with anyone and you can safely ignore this email.</p>
  `);
  const text = `${code} is your UpJob verification code

Hi ${name || "there"},

Use this code to finish signing in to your UpJob account. It expires in ${expiresInMinutes} minutes and can only be used once.

If this wasn't you, don't share the code with anyone and you can safely ignore this email.`;
  return { subject, html, text };
}

export function applicationStatusEmail({
  name,
  jobTitle,
  companyName,
  status,
}: {
  name: string;
  jobTitle: string;
  companyName: string;
  status: string;
}): { subject: string; html: string; text: string } {
  const statusLabel = STATUS_LABELS[status] ?? status;
  const subject = `Application ${statusLabel.toLowerCase()} — ${jobTitle} at ${companyName}`;
  const html = layout(`
    <h1 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#18181b;">Application update</h1>
    <p style="margin:0 0 12px;">Hi ${escapeHtml(name || "there")},</p>
    <p style="margin:0 0 12px;">Your application for <strong>${escapeHtml(jobTitle)}</strong> at <strong>${escapeHtml(companyName)}</strong> is now <strong>${statusLabel}</strong>.</p>
    <p style="margin:0;">Sign in to your dashboard to see the full details: <a href="${APP_URL}/dashboard" style="color:#2563eb;text-decoration:none;">${APP_URL}/dashboard</a></p>
  `);
  const text = `Application update

Hi ${name || "there"},

Your application for ${jobTitle} at ${companyName} is now ${statusLabel}.

Sign in at ${APP_URL}/dashboard to see the full details.`;
  return { subject, html, text };
}

/** Inbox message from the public contact form. Reply-to is the sender. */
export function contactMessageEmail({
  name,
  email,
  subject,
  message,
}: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): { subject: string; html: string; text: string } {
  const mailSubject = `UpJob contact: ${subject}`;
  const html = layout(`
    <h1 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#18181b;">${escapeHtml(subject)}</h1>
    <p style="margin:0 0 12px;"><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;</p>
    <p style="margin:0 0 16px;white-space:pre-wrap;">${escapeHtml(message)}</p>
  `);
  const text = `From: ${name} <${email}>\nSubject: ${subject}\n\n${message}`;
  return { subject: mailSubject, html, text };
}

const STATUS_LABELS: Record<string, string> = {
  SHORTLISTED: "Shortlisted",
  INTERVIEW: "Interview",
  SELECTED: "Selected",
  REJECTED: "Rejected",
  APPLIED: "Applied",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildResetUrl(token: string): string {
  return `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
}