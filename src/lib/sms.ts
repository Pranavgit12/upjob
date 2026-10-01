/**
 * SMS transport for OTP delivery.
 *
 * Speaks the Twilio Messages REST shape, which is the de-facto standard that
 * Twilio, MessageBird, Vonage and most gateways implement. `SMS_API_BASE_URL`
 * lets you point at a different host without code changes. Deliberately built
 * on `fetch` so the project gains SMS delivery without gaining an SDK
 * dependency.
 */

const DEFAULT_API_BASE_URL = "https://api.twilio.com/2010-04-01";

export interface SendSmsArgs {
  to: string;
  body: string;
  name?: string;
}

function config() {
  return {
    accountSid: process.env.SMS_ACCOUNT_SID,
    authToken: process.env.SMS_AUTH_TOKEN,
    from: process.env.SMS_FROM,
    baseUrl: (process.env.SMS_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, ""),
  };
}

export function isSmsConfigured(): boolean {
  const { accountSid, authToken, from } = config();
  return Boolean(accountSid && authToken && from);
}

export interface SendSmsResult {
  ok: boolean;
  error?: string;
  /** True when no SMS backend is configured and the message was only logged. */
  skipped?: boolean;
}

export async function sendSms({ to, body, name }: SendSmsArgs): Promise<SendSmsResult> {
  const { accountSid, authToken, from, baseUrl } = config();

  if (!accountSid || !authToken || !from) {
    console.info(`[sms] SMS not configured. Would send to ${to} for ${name ?? "unknown user"}: ${body}`);
    return { ok: true, skipped: true };
  }

  const endpoint = `${baseUrl}/Accounts/${accountSid}/Messages.json`;
  const authorization = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const error = `SMS gateway responded ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`;
      console.error(`[sms] Failed to send to ${to}:`, error);
      return { ok: false, error };
    }

    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    console.error(`[sms] Failed to send to ${to}:`, error);
    return { ok: false, error };
  }
}
