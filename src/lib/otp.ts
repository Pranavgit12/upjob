import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { OtpCarrier, OtpChallenge, OtpPurpose, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCarrier, maskDestination } from "@/lib/carriers";

export const OTP_CODE_LENGTH = 6;
export const OTP_CODE_EXPIRES_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 30;

function generateNumericCode(): string {
  const min = 10 ** (OTP_CODE_LENGTH - 1);
  const max = 10 ** OTP_CODE_LENGTH - 1;
  return randomInt(min, max + 1).toString().padStart(OTP_CODE_LENGTH, "0");
}

export interface CreateOtpChallengeResult {
  challengeId: string;
  maskedDestination: string;
  expiresAt: Date;
  resendAfter: Date;
  /** False when the transport rejected the message — caller must not mint a session. */
  delivered: boolean;
  deliveryError?: string;
  /** True when the resend cooldown suppressed a second send. */
  throttled?: boolean;
  /** Populated only in development, so a self-hosted dev box can read the code. */
  codePreview?: string | null;
}

export async function createOtpChallenge(args: {
  user: Pick<User, "id" | "email" | "name" | "phone" | "preferredCarrier">;
  carrier: OtpCarrier;
  purpose?: OtpPurpose;
}): Promise<CreateOtpChallengeResult> {
  const { user, carrier, purpose = OtpPurpose.LOGIN } = args;
  const transport = getCarrier(carrier);
  const destination = transport.destinationFor({ email: user.email, phone: user.phone });

  if (!destination) {
    throw new Error("No destination available for the selected carrier");
  }

  const now = new Date();
  const resendAfter = new Date(now.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000);

  const inFlight = await prisma.otpChallenge.findFirst({
    where: { userId: user.id, purpose, consumedAt: null, verifiedAt: null },
    orderBy: { lastSentAt: "desc" },
  });

  if (inFlight && inFlight.lastSentAt.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000 > now.getTime()) {
    // Cooldown is active. Report the pending challenge rather than minting a new
    // code, so a caller cannot use this endpoint as a mail-bomb.
    return {
      challengeId: inFlight.id,
      maskedDestination: maskDestination(inFlight.carrier, inFlight.destination),
      expiresAt: inFlight.expiresAt,
      resendAfter: new Date(inFlight.lastSentAt.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000),
      delivered: true,
      throttled: true,
    };
  }

  const code = generateNumericCode();
  const codeHash = await bcrypt.hash(code, 12);
  const expiresAt = new Date(now.getTime() + OTP_CODE_EXPIRES_MINUTES * 60 * 1000);

  const challenge = await prisma.$transaction(async (tx) => {
    // Retire any other live challenge for this (user, purpose) so only one code
    // is ever redeemable at a time.
    await tx.otpChallenge.updateMany({
      where: { userId: user.id, purpose, consumedAt: null, verifiedAt: null },
      data: { consumedAt: now },
    });

    const created = await tx.otpChallenge.create({
      data: {
        userId: user.id,
        purpose,
        carrier,
        destination,
        codeHash,
        expiresAt,
        lastSentAt: now,
        maxAttempts: OTP_MAX_ATTEMPTS,
      },
    });

    if (user.preferredCarrier !== carrier) {
      await tx.user.update({ where: { id: user.id }, data: { preferredCarrier: carrier } });
    }

    return created;
  });

  const delivery = await transport.deliver({
    destination,
    code,
    name: user.name,
    expiresInMinutes: OTP_CODE_EXPIRES_MINUTES,
  });

  if (!delivery.ok) {
    console.error(
      `[otp] Delivery failed over ${carrier} for user ${user.id}: ${delivery.error ?? "unknown"}`,
    );
  }

  return {
    challengeId: challenge.id,
    maskedDestination: maskDestination(challenge.carrier, challenge.destination),
    expiresAt,
    resendAfter,
    delivered: delivery.ok,
    deliveryError: delivery.error,
    codePreview: process.env.NODE_ENV === "development" ? code : null,
  };
}

export type OtpFailure = "invalid" | "expired" | "locked" | "consumed";

export async function verifyOtpChallenge(args: {
  challengeId: string;
  userId: string;
  code: string;
  purpose?: OtpPurpose;
}): Promise<{ ok: true; carrier: OtpCarrier } | { ok: false; error: OtpFailure }> {
  const { challengeId, userId, code, purpose = OtpPurpose.LOGIN } = args;

  const challenge = await prisma.otpChallenge.findUnique({ where: { id: challengeId } });
  if (!challenge || challenge.userId !== userId || challenge.purpose !== purpose) {
    return { ok: false, error: "invalid" };
  }
  if (challenge.verifiedAt || challenge.consumedAt) return { ok: false, error: "consumed" };
  if (challenge.expiresAt.getTime() <= Date.now()) return { ok: false, error: "expired" };

  // Count the attempt before verifying so the counter advances even on success.
  const attempt = await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { attempts: { increment: 1 } },
    select: { attempts: true },
  });

  if (attempt.attempts > challenge.maxAttempts) return { ok: false, error: "locked" };

  const normalized = code.trim();
  if (!/^\d+$/.test(normalized) || !(await bcrypt.compare(normalized, challenge.codeHash))) {
    if (attempt.attempts >= challenge.maxAttempts) return { ok: false, error: "locked" };
    return { ok: false, error: "invalid" };
  }

  // Atomic single-use redemption: the `consumedAt: null` guard makes the
  // update fail if a concurrent request already redeemed this code.
  const redeemed = await prisma.otpChallenge.updateMany({
    where: { id: challenge.id, consumedAt: null, verifiedAt: null },
    data: { consumedAt: new Date(), verifiedAt: new Date() },
  });
  if (redeemed.count !== 1) return { ok: false, error: "consumed" };

  return { ok: true, carrier: challenge.carrier };
}

/** Removes challenges that expired more than a retention window ago. */
export async function cleanupExpiredOtpChallenges(): Promise<number> {
  const retentionCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { count } = await prisma.otpChallenge.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: retentionCutoff } },
        { consumedAt: { not: null }, expiresAt: { lt: retentionCutoff } },
      ],
    },
  });
  return count;
}

export type { OtpCarrier, OtpPurpose, OtpChallenge };
