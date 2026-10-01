import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createOtpChallengeToken, createSession, OTP_CHALLENGE_COOKIE, toClientRole } from "@/lib/auth";
import { availableCarriers } from "@/lib/carriers";
import { createOtpChallenge, OTP_RESEND_COOLDOWN_SECONDS } from "@/lib/otp";
import { shouldChallengeForOtp } from "@/lib/otp-policy";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (!code || error) {
    return NextResponse.redirect(`${appUrl}/login?error=google_denied`);
  }

  if (!googleClientId || !googleClientSecret) {
    return NextResponse.redirect(`${appUrl}/login?error=google_not_configured`);
  }

  const redirectUri = `${appUrl}/api/auth/google/callback`;

  let userInfo: GoogleUserInfo;
  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenRes.ok || !tokenData.access_token) {
      return NextResponse.redirect(`${appUrl}/login?error=google_denied`);
    }

    const userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(`${appUrl}/login?error=google_denied`);
    }

    userInfo = (await userRes.json()) as GoogleUserInfo;
  } catch {
    return NextResponse.redirect(`${appUrl}/login?error=google_failed`);
  }

  if (!userInfo.email) {
    return NextResponse.redirect(`${appUrl}/login?error=google_no_email`);
  }

  const email = userInfo.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  let userId: string;
  if (existing) {
    userId = existing.id;
    if (userInfo.picture && existing.image !== userInfo.picture) {
      await prisma.user
        .update({ where: { id: existing.id }, data: { image: userInfo.picture } })
        .catch(() => {});
    }
  } else {
    const created = await prisma.user.create({
      data: {
        email,
        name: userInfo.name || userInfo.given_name || email.split("@")[0],
        role: Role.CANDIDATE,
        emailVerified: Boolean(userInfo.verified_email),
        image: userInfo.picture || null,
      },
      select: { id: true },
    });
    userId = created.id;
  }

  const role = toClientRole(existing?.role ?? Role.CANDIDATE);

  // Google proves identity but is still only one factor. Route through the same
  // OTP challenge as password login, otherwise "Sign in with Google" silently
  // becomes a way to bypass MFA.
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user && shouldChallengeForOtp(user)) {
    const carriers = availableCarriers(user, user.preferredCarrier);
    const challenge =
      carriers.length > 0
        ? await createOtpChallenge({ user, carrier: carriers[0].id })
        : null;

    if (challenge?.delivered) {
      const challengeToken = await createOtpChallengeToken({
        userId: user.id,
        challengeId: challenge.challengeId,
      });
      const response = NextResponse.redirect(`${appUrl}/login?verify=required`);
      response.cookies.set(OTP_CHALLENGE_COOKIE, challengeToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: OTP_RESEND_COOLDOWN_SECONDS * 20,
      });
      return response;
    }

    // Fail CLOSED. Issuing a session here would make OTP delivery an
    // optional control that any fault in the mail transport silently disables -
    // i.e. "Sign in with Google" would become a reliable MFA bypass. The user is
    // redirected to the login page with an explanation and can retry once
    // delivery recovers, or use the password flow. Admins are exempt by policy.
    console.error(
      `[auth] Google login for ${userId} could not deliver an OTP; refusing to issue a session.`,
    );
    return NextResponse.redirect(`${appUrl}/login?error=otp_unavailable`);
  }

  if (user) {
    await createSession({ id: userId, role, sessionVersion: user.sessionVersion });
  } else {
    await createSession({ id: userId, role });
  }

  return NextResponse.redirect(`${appUrl}/dashboard`);
}