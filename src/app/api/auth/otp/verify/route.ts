import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { OtpCarrier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  OTP_CHALLENGE_COOKIE,
  createSession,
  toClientRole,
  verifyOtpChallengeToken,
} from "@/lib/auth";
import { verifyOtpChallenge } from "@/lib/otp";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const VERIFY_WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_IP = 30;
const MAX_PER_USER = 15;

export async function POST(req: Request) {
  let body: { code?: string; challengeId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const code = body.code?.trim() ?? "";
  if (!code || code.length < 4) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(OTP_CHALLENGE_COOKIE)?.value;

  const pending = token ? await verifyOtpChallengeToken(token) : null;
  // The signed cookie is the authority. `challengeId` from the body is only a
  // fallback for clients that lost the cookie, and it is still bound to
  // `userId` from the cookie — never taken from the request.
  const challengeId = pending?.challengeId ?? body.challengeId;
  const userId = pending?.userId ?? null;

  if (!challengeId || !userId) {
    return NextResponse.json(
      { error: "Verification expired. Please sign in again." },
      { status: 401 },
    );
  }

  const ip = clientIp(req.headers);
  const ipLimit = rateLimit(`otp:verify:ip:${ip}`, MAX_PER_IP, VERIFY_WINDOW_MS);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "Too many verification attempts. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter) } },
    );
  }
  const userLimit = rateLimit(`otp:verify:user:${userId}`, MAX_PER_USER, VERIFY_WINDOW_MS);
  if (!userLimit.ok) {
    return NextResponse.json(
      { error: "Too many verification attempts. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(userLimit.retryAfter) } },
    );
  }

  const result = await verifyOtpChallenge({ challengeId, userId, code });
  if (!result.ok) {
    const errorMessage =
      result.error === "expired"
        ? "This code has expired. Request a new one."
        : result.error === "locked"
          ? "Too many incorrect attempts. Request a new code."
          : result.error === "consumed"
            ? "This code has already been used. Sign in again."
            : "That code doesn't look right. Try again.";

    return NextResponse.json(
      { error: errorMessage },
      { status: result.error === "locked" ? 423 : 401 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Only the email carrier proves control of the email address. A code that
  // arrived by SMS says nothing about the mailbox.
  if (result.carrier === OtpCarrier.EMAIL && !user.emailVerified) {
    await prisma.user
      .update({ where: { id: user.id }, data: { emailVerified: true } })
      .catch((err) => console.error(`[otp] Failed to mark email verified for ${user.id}:`, err));
  }

  const role = toClientRole(user.role);

  await createSession({ id: user.id, role, sessionVersion: user.sessionVersion });

  const response = NextResponse.json({
    ok: true,
    next: pending?.next ?? null,
    user: { id: user.id, email: user.email, name: user.name, role },
  });
  response.cookies.delete(OTP_CHALLENGE_COOKIE);
  return response;
}
