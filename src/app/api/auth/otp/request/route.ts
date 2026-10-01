import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { OtpCarrier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createOtpChallengeToken, OTP_CHALLENGE_COOKIE, verifyOtpChallengeToken } from "@/lib/auth";
import { availableCarriers } from "@/lib/carriers";
import { createOtpChallenge, OTP_RESEND_COOLDOWN_SECONDS } from "@/lib/otp";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const REQUEST_WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_IP = 30;
const MAX_PER_USER = 10;

function parseCarrier(value: unknown): OtpCarrier | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return normalized === OtpCarrier.EMAIL || normalized === OtpCarrier.SMS
    ? (normalized as OtpCarrier)
    : null;
}

/**
 * Issues (or re-issues) a one-time code for a pending login challenge, on
 * either the currently active carrier or one the user switches to.
 *
 * Anti-abuse, in order: per-IP and per-user fixed-window limits, then the
 * per-challenge resend cooldown enforced inside `createOtpChallenge`.
 */
export async function POST(req: Request) {
  let body: { carrier?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(OTP_CHALLENGE_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "No pending verification" }, { status: 400 });
  }

  const pending = await verifyOtpChallengeToken(token);
  if (!pending) {
    return NextResponse.json(
      { error: "Verification expired. Please sign in again." },
      { status: 401 },
    );
  }

  const ip = clientIp(req.headers);
  const ipLimit = rateLimit(`otp:ip:${ip}`, MAX_PER_IP, REQUEST_WINDOW_MS);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "Too many codes requested. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter) } },
    );
  }
  const userLimit = rateLimit(`otp:user:${pending.userId}`, MAX_PER_USER, REQUEST_WINDOW_MS);
  if (!userLimit.ok) {
    return NextResponse.json(
      { error: "Too many codes requested. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(userLimit.retryAfter) } },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: pending.userId } });
  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const carriers = availableCarriers(user, user.preferredCarrier);
  const requested = parseCarrier(body.carrier);
  const selected = requested
    ? carriers.find((c) => c.id === requested)
    : carriers.find((c) => c.preferred) ?? carriers[0];

  if (!selected) {
    return NextResponse.json(
      { error: requested ? "That delivery method isn't available on your account." : "No delivery method available" },
      { status: 400 },
    );
  }

  const challenge = await createOtpChallenge({ user, carrier: selected.id });

  if (!challenge.delivered) {
    return NextResponse.json(
      { error: "We couldn't send a verification code. Please try another method." },
      { status: 502 },
    );
  }

  // Re-issue the cookie: it now points at the newly created challenge and
  // refreshes the client's 10-minute window.
  const challengeToken = await createOtpChallengeToken({
    userId: user.id,
    challengeId: challenge.challengeId,
    next: pending.next,
  });
  cookieStore.set(OTP_CHALLENGE_COOKIE, challengeToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OTP_RESEND_COOLDOWN_SECONDS * 20,
  });

  return NextResponse.json({
    challengeId: challenge.challengeId,
    carrier: selected.id,
    maskedDestination: challenge.maskedDestination,
    expiresAt: challenge.expiresAt.toISOString(),
    resendAfter: challenge.resendAfter.toISOString(),
    resendCooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    throttled: challenge.throttled ?? false,
    carriers,
    next: pending.next,
    ...(challenge.codePreview ? { devCode: challenge.codePreview } : {}),
  });
}
