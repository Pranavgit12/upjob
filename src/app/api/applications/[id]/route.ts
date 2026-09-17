import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@prisma/client";
import { sendEmail, applicationStatusEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const STATUS_VALUES = new Set(Object.values(ApplicationStatus) as string[]);

export async function PATCH(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "employer" && user.role !== "admin") {
    return NextResponse.json({ error: "Employer access required" }, { status: 403 });
  }

  const { id } = await params;
  const application = await prisma.application.findUnique({
    where: { id },
    select: { job: { select: { createdBy: true } } },
  });
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (user.role === "employer" && application.job.createdBy !== user.id) {
    return NextResponse.json({ error: "Not your application" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.status === "string") {
    const status = body.status.toUpperCase();
    if (!STATUS_VALUES.has(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = status;
  }
  if (typeof body.notes === "string") {
    data.recruiterNotes = body.notes.slice(0, 2000) || null;
  }
  if (body.status === undefined && body.notes === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.application.update({
    where: { id },
    data: data as never,
    select: {
      id: true,
      status: true,
      recruiterNotes: true,
      updatedAt: true,
      user: { select: { name: true, email: true } },
      job: { select: { title: true, company: { select: { name: true } } } },
    },
  });

  if (data.status) {
    const role = data.status as string;
    const mail = applicationStatusEmail({
      name: updated.user.name ?? "",
      jobTitle: updated.job.title,
      companyName: updated.job.company?.name ?? "",
      status: role,
    });
    sendEmail({ to: updated.user.email, subject: mail.subject, html: mail.html, text: mail.text }).catch(() => {});
  }

  return NextResponse.json({ application: { id: updated.id, status: updated.status, recruiterNotes: updated.recruiterNotes, updatedAt: updated.updatedAt } });
}

// Candidate-owner view of their own application (used by the dashboard).
export async function GET(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      job: { select: { title: true, createdBy: true, company: { select: { name: true } } } },
      aiInterview: {
        select: {
          status: true,
          inviteToken: true,
          startedAt: true,
          completedAt: true,
          currentStep: true,
          maxSteps: true,
        },
      },
    },
  });
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  if (user.role === "candidate" && application.userId !== user.id) {
    return NextResponse.json({ error: "Not your application" }, { status: 403 });
  }
  const isHr = user.role === "admin" || user.role === "employer";
  if (user.role === "employer" && application.job.createdBy !== user.id) {
    return NextResponse.json({ error: "Not your application" }, { status: 403 });
  }
  if (!isHr && user.role !== "candidate") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    id: application.id,
    status: application.status,
    recruiterNotes: isHr ? application.recruiterNotes : null,
    jobTitle: application.job.title,
    companyName: application.job.company.name,
    interview: application.aiInterview
      ? {
          token: application.aiInterview.inviteToken,
          status: application.aiInterview.status,
          startedAt: application.aiInterview.startedAt?.toISOString() ?? null,
          completedAt: application.aiInterview.completedAt?.toISOString() ?? null,
          currentStep: application.aiInterview.currentStep,
          maxSteps: application.aiInterview.maxSteps,
        }
      : null,
  });
}