import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/auth";
import { passwordResetEmail, sendEmail, buildResetUrl } from "@/lib/email";

export async function POST(req: Request) {
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "Enter your email" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to avoid leaking which accounts exist.
  if (user) {
    const token = await createPasswordResetToken(user.id);
    const { subject, html, text } = passwordResetEmail(user.name, buildResetUrl(token));
    await sendEmail({ to: user.email, subject, html, text });
  }

  return NextResponse.json({ ok: true });
}