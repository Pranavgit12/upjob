import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyPasswordResetToken, createSession, toClientRole } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const RESET_WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = 20;

export async function POST(req: Request) {
  let body: { token?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!token) {
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const ipLimit = rateLimit(`reset:ip:${clientIp(req.headers)}`, MAX_PER_IP, RESET_WINDOW_MS);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter) } },
    );
  }

  const userId = await verifyPasswordResetToken(token);
  if (!userId) {
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // `sessionVersion` is bumped in the same statement as the password change so
  // that every session cookie issued before the reset stops validating. Without
  // this a stolen 30-day cookie survives a password reset.
  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, sessionVersion: { increment: 1 } },
    select: { id: true, email: true, name: true, role: true, sessionVersion: true },
  });

  const role = toClientRole(user.role);
  await createSession({ id: user.id, role, sessionVersion: user.sessionVersion });

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role },
  });
}
