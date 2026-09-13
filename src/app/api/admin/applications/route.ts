import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAiInterviewForApplication } from "@/lib/interview";
import { cvScore, blendOverall } from "@/lib/cv-score";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

async function adminOnly() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });
  return null;
}

const VALID_ROLES: Role[] = ["CANDIDATE", "EMPLOYER", "ADMIN"];

// Admin CRM: manually add a candidate (with optional phone) against a job, then
// auto-create their AI interview invite so the flow starts immediately.
export async function POST(req: Request) {
  const denied = await adminOnly();
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim().slice(0, 160);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 200);
  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 24) : null;
  const password = String(body.password ?? "");
  const jobId = String(body.jobId ?? "");
  const role = String(body.role ?? "CANDIDATE").toUpperCase();

  if (!name || !email) return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  if (!VALID_ROLES.includes(role as Role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  if (!jobId) return NextResponse.json({ error: "Job is required for an applicant" }, { status: 400 });

  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true, status: true } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.status === "CLOSED") return NextResponse.json({ error: "Job is closed" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, phone: phone ?? undefined, role: role as Role },
    create: { email, name, passwordHash, phone: phone ?? undefined, role: role as Role, emailVerified: true },
    select: { id: true, name: true, email: true, phone: true },
  });

  const application = await prisma.application.upsert({
    where: { userId_jobId: { userId: user.id, jobId } },
    update: {},
    create: { userId: user.id, jobId },
    select: { id: true, createdAt: true },
  });

  const created = await createAiInterviewForApplication(application.id);

  return NextResponse.json(
    {
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
      applicationId: application.id,
      interview: { inviteToken: created.inviteToken, status: created.existing ? "EXISTING" : "INVITED" },
      inviteUrl: `/interview/${created.inviteToken}`,
    },
    { status: 201 }
  );
}

// Admin CRM: every application across the platform, with CV + interview scores.
export async function GET() {
  const denied = await adminOnly();
  if (denied) return denied;

  const applications = await prisma.application.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
      job: {
        select: { id: true, title: true, type: true, company: { select: { name: true } } },
      },
      resume: {
        select: { fileName: true, parsedText: true, structuredData: true },
      },
      aiInterview: {
        select: {
          id: true,
          inviteToken: true,
          status: true,
          score: true,
          recommendation: true,
          currentStep: true,
          maxSteps: true,
          completedAt: true,
        },
      },
    },
  });

  const list = applications.map((a) => {
    const cvScoreValue = cvScore(a.resume?.structuredData ?? null, a.resume?.parsedText ?? null);
    return {
      id: a.id,
      candidate: {
        id: a.user.id,
        name: a.user.name,
        email: a.user.email,
        phone: a.user.phone,
        joinedAt: a.user.createdAt.toISOString(),
      },
      job: { id: a.job.id, title: a.job.title, companyName: a.job.company.name },
      appliedAt: a.createdAt.toISOString(),
      status: a.status,
      cvScore: cvScoreValue,
      resumeFileName: a.resume?.fileName ?? null,
      interview: a.aiInterview
        ? {
            token: a.aiInterview.inviteToken,
            status: a.aiInterview.status,
            score: a.aiInterview.score,
            overall: blendOverall(cvScoreValue, a.aiInterview.score),
            recommendation: a.aiInterview.recommendation,
            currentStep: a.aiInterview.currentStep,
            maxSteps: a.aiInterview.maxSteps,
            completedAt: a.aiInterview.completedAt?.toISOString() ?? null,
          }
        : null,
    };
  });

  return NextResponse.json({ applications: list });
}