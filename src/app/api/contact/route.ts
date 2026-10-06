import { NextResponse } from "next/server";
import { contactMessageEmail, sendEmail } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const CONTACT_WINDOW_MS = 60 * 60 * 1000;
const CONTACT_MAX_PER_IP = 5;
const INBOX = process.env.CONTACT_INBOX || "hello@upjob.app";

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const body = payload as Record<string, unknown>;

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const subject = clean(body.subject, 200);
  const message = clean(body.message, 5000);

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const ip = clientIp(req.headers);
  const limit = rateLimit(`contact:${ip}`, CONTACT_MAX_PER_IP, CONTACT_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many messages from this network. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const { subject: mailSubject, html, text } = contactMessageEmail({
    name,
    email,
    subject,
    message,
  });
  const result = await sendEmail({ to: INBOX, subject: mailSubject, html, text, replyTo: email });
  if (!result.ok) {
    return NextResponse.json(
      { error: "We couldn't send your message. Please email us directly instead." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
