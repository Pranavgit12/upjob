import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OTP_CHALLENGE_COOKIE, verifyOtpChallengeToken } from "@/lib/auth";
import { availableCarriers, maskDestination } from "@/lib/carriers";

/**
 * Returns the carriers available to the user currently holding a pending OTP
 * challenge, plus which carrier is live right now.
 *
 * The signed challenge cookie is the authority. A bare `challengeId` is never
 * trusted, because the challenge row is only ever read after the cookie has been
 * resolved to a userId.
 */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(OTP_CHALLENGE_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "No pending verification" }, { status: 400 });
  }

  const challenge = await verifyOtpChallengeToken(token);
  if (!challenge) {
    return NextResponse.json({ error: "Verification expired. Please sign in again." }, { status: 401 });
  }

  const [user, row] = await Promise.all([
    prisma.user.findUnique({
      where: { id: challenge.userId },
      select: { email: true, phone: true, preferredCarrier: true },
    }),
    prisma.otpChallenge.findUnique({
      where: { id: challenge.challengeId },
      select: {
        id: true,
        carrier: true,
        destination: true,
        expiresAt: true,
        consumedAt: true,
        verifiedAt: true,
      },
    }),
  ]);

  const expired = !row || row.expiresAt.getTime() <= Date.now();
  if (!user || !row || row.consumedAt || row.verifiedAt || expired) {
    return NextResponse.json(
      { error: "Verification expired. Please sign in again." },
      { status: 401 },
    );
  }

  return NextResponse.json({
    carriers: availableCarriers(user, user.preferredCarrier),
    activeCarrier: row.carrier,
    activeMaskedDestination: maskDestination(row.carrier, row.destination),
    expiresAt: row.expiresAt.toISOString(),
  });
}
