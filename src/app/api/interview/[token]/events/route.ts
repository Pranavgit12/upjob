import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

const ALLOWED_EVENT_TYPES = new Set([
  "tab_switch",
  "blur",
  "camera_disconnected",
  "mic_disconnected",
  "candidate_not_visible",
  "refresh",
  "multi_face",
  "interruption",
]);

// Integrity signals are logged for HR review only — never used to auto-reject.
export async function POST(req: Request, { params }: Params) {
  const { token } = await params;
  let body: { events?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const raw = Array.isArray(body.events) ? body.events : [];
  if (!raw.length) return NextResponse.json({ ok: true });

  const interview = await prisma.aiInterview.findUnique({
    where: { inviteToken: token },
    select: { id: true, status: true },
  });
  if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });

  const events = raw
    .slice(0, 50)
    .map((e) => e as Record<string, unknown>)
    .filter((e) => ALLOWED_EVENT_TYPES.has(String(e?.eventType)))
    .map((e) => {
      let occurredAt = new Date();
      if (typeof e.occurredAt === "string") {
        const parsed = new Date(e.occurredAt);
        // Reject garbage timestamps instead of passing an Invalid Date to
        // Prisma, which turns a malformed report into an unhandled 500.
        if (!Number.isNaN(parsed.getTime())) occurredAt = parsed;
      }
      return {
        interviewId: interview.id,
        eventType: String(e.eventType),
        metadata: e.metadata && typeof e.metadata === "object" ? (e.metadata as object) : {},
        occurredAt,
      };
    });

  if (events.length) {
    await prisma.integrityEvent.createMany({ data: events });
  }
  return NextResponse.json({ ok: true, recorded: events.length });
}