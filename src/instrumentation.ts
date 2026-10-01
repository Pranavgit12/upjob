/**
 * Runs once when a new server instance starts, before it accepts requests.
 *
 * Used to fail fast on missing or malformed production configuration. Without
 * this, a missing AUTH_SECRET or an unreachable database would only surface as
 * a 500 on the first request that touches auth — after the container has already
 * been reported healthy by an orchestrator that only checks the port.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // `register()` can be invoked during `next build` on platforms that boot the
  // runtime while collecting page data. Failing there would make an unset
  // variable look like a broken build rather than a misconfigured deployment, so
  // the check is restricted to a real server process. `VERCEL` is set for both
  // build and runtime, so it cannot be used to tell them apart; the presence of
  // `NEXT_PHASE` is the reliable signal.
  if (process.env.NEXT_PHASE) return;

  if (process.env.NODE_ENV !== "production") return;

  const problems: string[] = [];

  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) {
    problems.push("AUTH_SECRET is not set");
  } else if (authSecret.length < 32) {
    problems.push(`AUTH_SECRET is only ${authSecret.length} chars; it must be at least 32`);
  }

  if (!process.env.DATABASE_URL) {
    problems.push("DATABASE_URL is not set");
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    problems.push("NEXT_PUBLIC_APP_URL is not set — password reset and OAuth links will be wrong");
  }

  const otpMode = process.env.OTP_MODE ?? "required";
  if (!process.env.RESEND_API_KEY) {
    // Not fatal on its own: SMS may be the only carrier, and dev logs emails.
    const smsReady = Boolean(
      process.env.SMS_ACCOUNT_SID && process.env.SMS_AUTH_TOKEN && process.env.SMS_FROM,
    );
    if (otpMode !== "off" && !smsReady) {
      problems.push(
        "No email or SMS carrier is configured. With OTP_MODE=" +
          otpMode +
          " every non-admin login will fail with HTTP 502 until RESEND_API_KEY is set.",
      );
    }
  }

  if (problems.length > 0) {
    const message = `[startup] Invalid production configuration:\n  - ${problems.join("\n  - ")}`;
    throw new Error(message);
  }

  console.info("[startup] Configuration validated.");
}
