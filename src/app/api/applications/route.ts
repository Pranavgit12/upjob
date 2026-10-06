import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAiInterviewForApplication } from "@/lib/interview";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "candidate" && user.role !== "admin") {
    return NextResponse.json({ error: "Candidates can apply to jobs" }, { status: 403 });
  }
  if (user.role === "admin") {
    return NextResponse.json({ error: "Admins cannot apply" }, { status: 403 });
  }

  let body: {
    jobId?: unknown;
    coverLetter?: unknown;
    name?: unknown;
    phone?: unknown;
    resumeId?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const jobId = String(body?.jobId ?? "");
  if (!jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  const coverLetter = typeof body?.coverLetter === "string" ? body.coverLetter.slice(0, 2000) : undefined;
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim().slice(0, 160) : undefined;
  const phone = typeof body?.phone === "string" && body.phone.trim() ? body.phone.trim().slice(0, 24) : undefined;

  // The submitted CV must belong to the applicant — never accept an arbitrary
  // resume id, which would attach someone else's document to this application.
  let resumeId: string | null = null;
  if (typeof body?.resumeId === "string" && body.resumeId) {
    const owned = await prisma.resume.findFirst({
      where: { id: body.resumeId, userId: user.id },
      select: { id: true },
    });
    if (!owned) return NextResponse.json({ error: "Resume not found" }, { status: 400 });
    resumeId = owned.id;
  } else {
    // No explicit CV attached: fall back to the applicant's primary resume so
    // the employer still gets a document to read.
    const primary = await prisma.resume.findFirst({
      where: { userId: user.id, isPrimary: true },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });
    resumeId = primary?.id ?? null;
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, title: true, status: true },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.status === "CLOSED") {
    return NextResponse.json({ error: "This job is no longer accepting applications" }, { status: 409 });
  }

  const application = await prisma.application.upsert({
    where: { userId_jobId: { userId: user.id, jobId } },
    update: {},
    create: {
      userId: user.id,
      jobId,
      coverLetter: coverLetter || undefined,
      resumeId,
    },
  });

  if (name || phone) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name ? { name: name as string } : {}),
        ...(phone ? { phone: phone as string } : {}),
      },
    });
  }

  const existingInterview = await prisma.aiInterview.findUnique({
    where: { applicationId: application.id },
    select: { id: true, inviteToken: true, status: true },
  });

  if (existingInterview) {
    return NextResponse.json({
      applicationId: application.id,
      alreadyApplied: true,
      interview: { inviteToken: existingInterview.inviteToken, status: existingInterview.status },
    });
  }

  const created = await createAiInterviewForApplication(application.id);
  return NextResponse.json({
    applicationId: application.id,
    alreadyApplied: false,
    interview: { inviteToken: created.inviteToken, status: "INVITED" },
  });
}

// Candidate dashboard: my applications with live AI interview status.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "candidate") {
    return NextResponse.json({ error: "Only candidates have applications" }, { status: 403 });
  }

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          type: true,
          company: { select: { name: true, logo: true } },
          salaryMin: true,
          isStipend: true,
          location: true,
          workMode: true,
          skills: true,
        },
      },
      resume: { select: { id: true, fileName: true, fileUrl: true, isPrimary: true } },
      aiInterview: {
        select: {
          id: true,
          inviteToken: true,
          status: true,
          startedAt: true,
          completedAt: true,
          currentStep: true,
          maxSteps: true,
        },
      },
    },
  });

  return NextResponse.json({
    applications: applications.map((a) => ({
      id: a.id,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
      job: a.job,
      resume: a.resume,
      interview: a.aiInterview
        ? {
            token: a.aiInterview.inviteToken,
            status: a.aiInterview.status,
            startedAt: a.aiInterview.startedAt?.toISOString() ?? null,
            completedAt: a.aiInterview.completedAt?.toISOString() ?? null,
            currentStep: a.aiInterview.currentStep,
            maxSteps: a.aiInterview.maxSteps,
            inviteUrl: `/interview/${a.aiInterview.inviteToken}`,
          }
        : null,
    })),
  });
}