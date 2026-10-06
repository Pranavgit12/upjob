import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/auth";
import { passwordResetEmail, sendEmail, buildResetUrl } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// Without a limit this endpoint is an open mail-bomb: anyone can POST any
// address and have the app send unlimited reset emails on their behalf.
const FORGOT_WINDOW_MS = 60 * 60 * 1000;
const FORGOT_MAX_PER_IP = 10;
const FORGOT_MAX_PER_EMAIL = 5;

export async function POST(req: Request) {
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "Enter your email" }, { status: 400 });
  }

  const ip = clientIp(req.headers);
  const ipLimit = rateLimit(`forgot:ip:${ip}`, FORGOT_MAX_PER_IP, FORGOT_WINDOW_MS);
  const emailLimit = rateLimit(`forgot:email:${email}`, FORGOT_MAX_PER_EMAIL, FORGOT_WINDOW_MS);
  if (!ipLimit.ok || !emailLimit.ok) {
    const retryAfter = Math.max(ipLimit.retryAfter, emailLimit.retryAfter);
    // The IP bucket trips first and is independent of whether the address has
    // an account, so a 429 here leaks nothing about account existence.
    return NextResponse.json(
      { error: "Too many reset requests. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to avoid leaking which accounts exist.
  if (user) {
    const token = await createPasswordResetToken(user.id);
    const { subject, html, text } = passwordResetEmail(user.name, buildResetUrl(token));
    await sendEmail({ to: user.email, subject, html, text });
  }

  return NextResponse.json({ ok: true });
}