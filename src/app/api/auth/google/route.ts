import { NextResponse } from "next/server";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET() {
  if (!googleClientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." },
      { status: 500 }
    );
  }

  const redirectUri = `${appUrl}/api/auth/google/callback`;
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", googleClientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("prompt", "select_account");
  authUrl.searchParams.set("access_type", "online");

  return NextResponse.redirect(authUrl.toString());
}