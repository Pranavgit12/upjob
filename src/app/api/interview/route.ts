import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAiInterviewForApplication } from "@/lib/interview";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "employer" && user.role !== "admin") {
    return NextResponse.json({ error: "Employer access required" }, { status: 403 });
  }

  let applicationId: string;
  try {
    const body = await req.json();
    applicationId = String(body?.applicationId ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!applicationId) return NextResponse.json({ error: "applicationId is required" }, { status: 400 });

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { job: { select: { createdBy: true } } },
  });
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const isOwner = application.job.createdBy === user.id || user.role === "admin";
  if (!isOwner) return NextResponse.json({ error: "Not your application" }, { status: 403 });

  try {
    const created = await createAiInterviewForApplication(applicationId);
    return NextResponse.json({
      interviewId: created.interviewId,
      inviteToken: created.inviteToken,
      existing: created.existing,
      status: created.existing ? "EXISTING" : "INVITED",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create interview" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "employer" && user.role !== "admin") {
    return NextResponse.json({ error: "Employer access required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "1";
  if (user.role !== "admin" && all) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const jobs =
    user.role === "admin" && all
      ? []
      : await prisma.job.findMany({
          where: { createdBy: user.id },
          select: { id: true },
        });
  const jobIds = jobs.map((j) => j.id);

  const applications =
    user.role === "admin" && all
      ? await prisma.application.findMany({
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true, email: true } },
            job: {
              select: {
                title: true,
                company: { select: { name: true, logo: true } },
              },
            },
            resume: { select: { id: true, fileName: true, isPrimary: true } },
            aiInterview: {
              include: {
                messages: { orderBy: { createdAt: "asc" }, select: { id: true, role: true, content: true, createdAt: true } },
              },
            },
          },
        })
      : jobIds.length === 0
        ? []
        : await prisma.application.findMany({
            where: { jobId: { in: jobIds } },
            orderBy: { createdAt: "desc" },
            include: {
              user: { select: { id: true, name: true, email: true } },
              job: {
                select: {
                  title: true,
                  company: { select: { name: true, logo: true } },
                },
              },
              resume: { select: { id: true, fileName: true, isPrimary: true } },
              aiInterview: {
                include: {
                  messages: { orderBy: { createdAt: "asc" }, select: { id: true, role: true, content: true, createdAt: true } },
                },
              },
            },
          });

  const list = applications.map((app) => ({
    id: app.id,
    candidateName: app.user.name,
    candidateEmail: app.user.email,
    jobTitle: app.job.title,
    companyName: app.job.company.name,
    appliedAt: app.createdAt.toISOString(),
    status: app.status,
    resume: app.resume ? { fileName: app.resume.fileName, isPrimary: app.resume.isPrimary } : null,
    ai: app.aiInterview
      ? {
          interviewId: app.aiInterview.id,
          inviteToken: app.aiInterview.inviteToken,
          status: app.aiInterview.status,
          score: app.aiInterview.score,
          summary: app.aiInterview.summary,
          verdict: app.aiInterview.verdict,
          strengths: app.aiInterview.strengths,
          concerns: app.aiInterview.concerns,
          maxSteps: app.aiInterview.maxSteps,
          currentStep: app.aiInterview.currentStep,
          completedAt: app.aiInterview.completedAt?.toISOString() ?? null,
          transcript: app.aiInterview.messages.map((m) => ({
            role: m.role,
            content: m.content,
            createdAt: m.createdAt.toISOString(),
          })),
        }
      : null,
  }));

  return NextResponse.json({ applications: list });
}