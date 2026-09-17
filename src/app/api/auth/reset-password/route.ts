import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyPasswordResetToken, createSession, toClientRole } from "@/lib/auth";

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

  const userId = await verifyPasswordResetToken(token);
  if (!userId) {
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
    select: { id: true, email: true, name: true, role: true },
  });

  await createSession({ id: user.id, role: toClientRole(user.role) });

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: toClientRole(user.role) },
  });
}