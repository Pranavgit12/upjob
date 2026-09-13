import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// Download the AI interview report as plain text (admin/employer only).
export async function GET(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "employer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const interview = await prisma.aiInterview.findUnique({
    where: { id },
    include: {
      application: {
        include: {
          job: { include: { company: { select: { name: true } } } },
          user: { select: { id: true, name: true, email: true } },
        },
      },
      answers: { orderBy: { questionIndex: "asc" } },
    },
  });
  if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });

  if (user.role === "employer") {
    const ownsJob = await prisma.job.count({ where: { id: interview.application.job.id, createdBy: user.id } });
    if (ownsJob === 0) return NextResponse.json({ error: "You don't manage this candidate" }, { status: 403 });
  }

  const report = interview.report && typeof interview.report === "object" && !Array.isArray(interview.report)
    ? (interview.report as Record<string, unknown>)
    : {};
  const scores = interview.categoryScores && typeof interview.categoryScores === "object" && !Array.isArray(interview.categoryScores)
    ? (interview.categoryScores as Record<string, number>)
    : {};

  const lines: string[] = [];
  const hr = "------------------------------------------------------------";
  lines.push("UPJOB - AI INTERVIEW REPORT");
  lines.push(hr);
  lines.push(`Candidate: ${interview.application.user.name} (${interview.application.user.email})`);
  lines.push(`Role: ${interview.application.job.title} - ${interview.application.job.company.name}`);
  lines.push(`Date: ${interview.startedAt?.toISOString() ?? "pending"}`);
  lines.push(`Duration: ${interview.durationSeconds ? `${Math.round(interview.durationSeconds / 60)} min` : "missing"}`);
  lines.push("");
  lines.push(`Overall score: ${interview.score ?? "n/a"}/100`);
  lines.push(`Recommendation: ${interview.recommendation ?? "n/a"}`);
  lines.push(`Verdict: ${interview.verdict ?? "n/a"}`);
  lines.push("");
  lines.push("SCORE BREAKDOWN");
  for (const [k, v] of Object.entries(scores)) {
    lines.push(`- ${k}: ${v}`);
  }
  lines.push("");
  lines.push("SUMMARY");
  lines.push(interview.summary ?? "n/a");
  lines.push("");
  lines.push("STRENGTHS");
  for (const s of interview.strengths) lines.push(`- ${s}`);
  lines.push("");
  lines.push("AREAS TO IMPROVE");
  for (const c of interview.concerns) lines.push(`- ${c}`);
  lines.push("");
  lines.push("QUESTION / ANSWER LOG");
  for (const a of interview.answers) {
    lines.push(`${a.questionIndex + 1}. ${a.question}`);
    lines.push(`   A (${a.durationSeconds}s): ${a.transcript}`.trim());
    lines.push("");
  }
  lines.push(hr);
  lines.push("This report is decision-support only. AI output should be reviewed by HR.");
  if (typeof report.notes === "string" && report.notes) {
    lines.push("");
    lines.push("HR NOTES");
    lines.push(report.notes);
  }

  const safeName = interview.application.user.name.replace(/[^\w ]+/g, "").replace(/\s+/g, "_");
  const body = lines.join("\n") + "\n";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="ai_interview_${safeName}.txt"`,
    },
  });
}