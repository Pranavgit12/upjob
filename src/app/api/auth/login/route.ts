import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, createOtpChallengeToken, OTP_CHALLENGE_COOKIE, toClientRole } from "@/lib/auth";
import { availableCarriers } from "@/lib/carriers";
import { createOtpChallenge, OTP_RESEND_COOLDOWN_SECONDS } from "@/lib/otp";
import { shouldChallengeForOtp } from "@/lib/otp-policy";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_PER_IP = 20;
const LOGIN_MAX_PER_ACCOUNT = 10;

export async function POST(req: Request) {
  let body: { email?: string; password?: string; next?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const ip = clientIp(req.headers);
  const ipLimit = rateLimit(`login:ip:${ip}`, LOGIN_MAX_PER_IP, LOGIN_WINDOW_MS);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Please wait a few minutes." },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter) } },
    );
  }
  const accountLimit = rateLimit(`login:acct:${email}`, LOGIN_MAX_PER_ACCOUNT, LOGIN_WINDOW_MS);
  if (!accountLimit.ok) {
    return NextResponse.json(
      { error: "Too many sign-in attempts for this account. Please wait a few minutes." },
      { status: 429, headers: { "Retry-After": String(accountLimit.retryAfter) } },
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const role = toClientRole(user.role);
  const next = typeof body.next === "string" && body.next.startsWith("/") ? body.next : null;

  if (shouldChallengeForOtp(user)) {
    // Password is correct but no session is issued yet. The user must clear a
    // one-time-code challenge before `upjob_session` is ever written.
    const carriers = availableCarriers(user, user.preferredCarrier);
    if (carriers.length === 0) {
      console.error(`[auth] No OTP carrier available for user ${user.id}; refusing login.`);
      return NextResponse.json(
        { error: "Verification is temporarily unavailable. Please contact support." },
        { status: 503 },
      );
    }

    const chosen = carriers[0];
    const challenge = await createOtpChallenge({
      user,
      carrier: chosen.id,
    });

    if (!challenge.delivered) {
      return NextResponse.json(
        { error: "We couldn't send a verification code. Please try again shortly." },
        { status: 502 },
      );
    }

    const challengeToken = await createOtpChallengeToken({
      userId: user.id,
      challengeId: challenge.challengeId,
      next,
    });

    const response = NextResponse.json(
      {
        mfaRequired: true,
        challengeId: challenge.challengeId,
        maskedDestination: challenge.maskedDestination,
        expiresAt: challenge.expiresAt.toISOString(),
        resendAfter: challenge.resendAfter.toISOString(),
        resendCooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
        carriers,
        next,
        ...(challenge.codePreview ? { devCode: challenge.codePreview } : {}),
      },
      { status: 202 },
    );
    response.cookies.set(OTP_CHALLENGE_COOKIE, challengeToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: OTP_RESEND_COOLDOWN_SECONDS * 20,
    });
    return response;
  }

  await createSession({
    id: user.id,
    role,
    sessionVersion: user.sessionVersion,
  });

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role },
  });
}
