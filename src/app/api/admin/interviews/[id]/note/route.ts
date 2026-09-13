import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// Store an internal HR note on the interview report (never shown to the candidate).
export async function POST(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "employer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  let body: { note?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const interview = await prisma.aiInterview.findUnique({
    where: { id },
    include: { application: { include: { job: true } } },
  });
  if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });

  if (user.role === "employer") {
    const ownsJob = await prisma.job.count({ where: { id: interview.application.job.id, createdBy: user.id } });
    if (ownsJob === 0) return NextResponse.json({ error: "You don't manage this candidate" }, { status: 403 });
  }

  const note = String(body.note ?? "").slice(0, 2000);
  const prev = interview.report && typeof interview.report === "object" && !Array.isArray(interview.report)
    ? (interview.report as Record<string, unknown>)
    : {};
  const nextReport = { ...prev, notes: note };

  await prisma.aiInterview.update({ where: { id }, data: { report: nextReport } });
  return NextResponse.json({ ok: true });
}