import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSession, toPrismaRole } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type { UserRole } from "@/types";

const SIGNUP_WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_IP = 10;

export async function POST(req: Request) {
  let body: { name?: string; email?: string; password?: string; role?: UserRole };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const role = body.role === "employer" ? "employer" : "candidate";

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  // Without this, signup is an open account-factory for whoever wants one.
  const ipLimit = rateLimit(`signup:ip:${clientIp(req.headers)}`, MAX_PER_IP, SIGNUP_WINDOW_MS);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "Too many accounts created from this network. Please try again later." },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter) } },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let user: { id: string; email: string; name: string; role: UserRole; sessionVersion: number };
  try {
    const row = await prisma.user.create({
      data: { name, email, passwordHash, role: toPrismaRole(role) },
      select: { id: true, email: true, name: true, role: true, sessionVersion: true },
    });
    // The row carries the DB enum value (e.g. "CANDIDATE"); the session type
    // uses the lowercase UserRole, so reuse the variable we normalized earlier.
    user = { ...row, role };
  } catch (err) {
    // Two concurrent signups for the same address race past the check above and
    // collide on the unique email constraint. Surface it as a clean 409 instead
    // of an unhandled Prisma error (500 with a hung client).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    throw err;
  }

  await createSession({ id: user.id, role, sessionVersion: user.sessionVersion });

  return NextResponse.json(
    { user: { id: user.id, email: user.email, name: user.name, role } },
    { status: 201 }
  );
}