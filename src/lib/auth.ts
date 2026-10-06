import { createHmac } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sanitizeNextPath } from "@/lib/utils";
import type { UserRole } from "@/types";

export const SESSION_COOKIE = "upjob_session";
export const OTP_CHALLENGE_COOKIE = "upjob_otp_challenge";
/** Binds the Google OAuth round-trip to the browser that started it (CSRF). */
export const OAUTH_STATE_COOKIE = "upjob_oauth_state";
export const OAUTH_STATE_MAX_AGE_SECONDS = 600;

const DEV_FALLBACK_SECRET = "dev-only-insecure-secret-change-me";
const MIN_PRODUCTION_SECRET_LENGTH = 32;

function resolveMasterSecret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET environment variable is required in production. Generate one with: openssl rand -base64 48",
      );
    }
    return DEV_FALLBACK_SECRET;
  }
  if (process.env.NODE_ENV === "production" && value.length < MIN_PRODUCTION_SECRET_LENGTH) {
    throw new Error(
      `AUTH_SECRET must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production`,
    );
  }
  return value;
}

/**
 * Every token family is signed with an independently derived key.
 *
 * A single shared secret meant a password-reset token — which travels in a URL
 * query string and leaks via `Referer`, history and shared links — was accepted
 * verbatim as a session cookie, because both families carried the same `sub`
 * and `getSessionUserId()` verified nothing but the signature. Domain
 * separation means a token minted for one purpose cannot pass signature
 * verification under another purpose's key, so the bug cannot recur even if a
 * future verifier forgets to inspect `purpose`.
 *
 * Resolved lazily rather than at module load: `next build` imports this module
 * while collecting page data, and a build must not require runtime secrets.
 * Startup validation lives in `src/instrumentation.ts` instead.
 */
function secretFor(purpose: string): Uint8Array {
  const derived = createHmac("sha256", resolveMasterSecret())
    .update(`upjob:${purpose}`)
    .digest("hex");
  return new TextEncoder().encode(derived);
}

const PURPOSES = {
  session: "session",
  passwordReset: "password-reset",
  otpChallenge: "otp-challenge",
} as const;

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const RESET_TOKEN_MAX_AGE = "60m";
const OTP_CHALLENGE_MAX_AGE = "10m";

async function signToken(
  payload: Record<string, unknown>,
  subject: string,
  purpose: string,
  expiresIn: string,
): Promise<string> {
  return new SignJWT({ ...payload, purpose })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretFor(purpose));
}

async function verifyToken(token: string, purpose: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, secretFor(purpose));
    if (payload.purpose !== purpose) return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

function toClientRole(role: Role): UserRole {
  switch (role) {
    case Role.EMPLOYER:
      return "employer";
    case Role.ADMIN:
      return "admin";
    default:
      return "candidate";
  }
}

function toPrismaRole(role: UserRole): Role {
  switch (role) {
    case "employer":
      return Role.EMPLOYER;
    case "admin":
      return Role.ADMIN;
    default:
      return Role.CANDIDATE;
  }
}

export async function createSession(user: {
  id: string;
  role: UserRole;
  sessionVersion?: number;
}): Promise<void> {
  const cookieStore = await cookies();
  const token = await signToken(
    { role: user.role, sv: user.sessionVersion ?? 0 },
    user.id,
    PURPOSES.session,
    "30d",
  );
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(OTP_CHALLENGE_COOKIE);
}

/**
 * Invalidates every existing session for a user by bumping their session
 * version. Call this on password change, on email change, and on "log out
 * everywhere" — without it a 30-day cookie survives a password reset.
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  });
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  return signToken({}, userId, PURPOSES.passwordReset, RESET_TOKEN_MAX_AGE);
}

export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  const payload = await verifyToken(token, PURPOSES.passwordReset);
  return typeof payload?.sub === "string" ? payload.sub : null;
}

export interface OtpChallengeToken {
  userId: string;
  challengeId: string;
  next: string | null;
}

export async function createOtpChallengeToken(claims: {
  userId: string;
  challengeId: string;
  next?: string | null;
}): Promise<string> {
  // Sanitised here rather than at each call site: the value is minted into a
  // signed cookie and replayed to the client as a redirect target, so a
  // protocol-relative URL (`//evil.com`) must never survive to this point.
  const next = sanitizeNextPath(claims.next);
  return signToken(
    { challengeId: claims.challengeId, next },
    claims.userId,
    PURPOSES.otpChallenge,
    OTP_CHALLENGE_MAX_AGE,
  );
}

export async function verifyOtpChallengeToken(token: string): Promise<OtpChallengeToken | null> {
  const payload = await verifyToken(token, PURPOSES.otpChallenge);
  if (!payload) return null;
  const { sub, challengeId, next } = payload;
  if (typeof sub !== "string" || typeof challengeId !== "string") return null;
  return {
    userId: sub,
    challengeId,
    next: sanitizeNextPath(next),
  };
}

export async function clearOtpChallengeCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(OTP_CHALLENGE_COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token, PURPOSES.session);
  if (typeof payload?.sub !== "string") return null;

  // The `role` claim is baked in at issue time and would otherwise stay valid
  // for 30 days after a demotion. Re-check the version counter so revocations
  // take effect immediately.
  const claimed = Number(payload.sv ?? 0);
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { sessionVersion: true },
  });
  if (!user || user.sessionVersion !== claimed) return null;

  return payload.sub;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const id = await getSessionUserId();
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) return null;
  return { id: user.id, email: user.email, name: user.name, role: toClientRole(user.role) };
}

export { toClientRole, toPrismaRole };
