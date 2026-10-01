import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { availableCarriers } from "@/lib/carriers";
import { otpMode } from "@/lib/otp-policy";

/** Reports the signed-in user's MFA state and which carriers they can use. */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, phone: true, preferredCarrier: true, mfaEnabled: true, emailVerified: true },
  });
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  return NextResponse.json({
    carriers: availableCarriers(user, user.preferredCarrier),
    mfaEnabled: user.mfaEnabled,
    emailVerified: user.emailVerified,
    mode: otpMode(),
  });
}

/**
 * Opt into or out of MFA. Only meaningful when `OTP_MODE=optional` — in
 * `required` mode every non-admin login is challenged regardless of this flag,
 * so the response says so instead of silently doing nothing.
 */
export async function POST(req: Request) {
  let body: { enabled?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "`enabled` must be a boolean" }, { status: 400 });
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, role: true },
  });
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  // Guard against the operator disabling MFA on the only account that can
  // re-enable it or reach the admin panel.
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const isAdminAccount =
    user.role === "ADMIN" || (adminEmail && user.email.toLowerCase() === adminEmail);
  if (body.enabled === false && isAdminAccount) {
    return NextResponse.json(
      { error: "MFA cannot be disabled on the administrator account." },
      { status: 403 },
    );
  }

  await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: body.enabled } });

  return NextResponse.json({
    mfaEnabled: body.enabled,
    mode: otpMode(),
    message:
      otpMode() === "required"
        ? "Saved. Note: OTP_MODE=required challenges every non-admin login regardless of this setting."
        : "Saved.",
  });
}
