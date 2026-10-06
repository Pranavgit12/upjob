import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toClientJob } from "@/lib/db-data";
import { JobStatus, JobType, WorkMode } from "@prisma/client";

export const dynamic = "force-dynamic";

const TEXT_FIELDS = ["title", "category", "location", "experience", "description"] as const;
const LIST_FIELDS = ["skills", "responsibilities", "requirements", "benefits"] as const;
const INT_FIELDS = ["salaryMin", "salaryMax", "vacancy"] as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: { company: { select: { name: true } } },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json({ job: toClientJob(job as never) });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "employer" && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (user.role === "employer" && existing.createdBy !== user.id) {
    return NextResponse.json({ error: "Only the owning employer can edit this job" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const body = payload as Record<string, unknown>;

  // Explicit allow-list. The previous implementation copied every scalar in the
  // body straight into `prisma.job.update`, so a caller could overwrite
  // `createdBy` (transferring ownership), `isModerated` (clearing moderation) or
  // send an invalid enum and trigger an unhandled Prisma error.
  const data: Record<string, unknown> = {};

  if (typeof body.status === "string") {
    const status = body.status.toLowerCase();
    if (status === "open") data.status = JobStatus.OPEN;
    else if (status === "closed") data.status = JobStatus.CLOSED;
    else if (status === "draft") data.status = JobStatus.DRAFT;
    else return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (typeof body.isModerated === "boolean") {
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Only admins can change moderation" }, { status: 403 });
    }
    data.isModerated = body.isModerated;
  }

  if (typeof body.type === "string") {
    if (!Object.values(JobType).includes(body.type as JobType)) {
      return NextResponse.json({ error: "Invalid job type" }, { status: 400 });
    }
    data.type = body.type;
  }
  if (typeof body.workMode === "string") {
    if (!Object.values(WorkMode).includes(body.workMode as WorkMode)) {
      return NextResponse.json({ error: "Invalid work mode" }, { status: 400 });
    }
    data.workMode = body.workMode;
  }

  for (const key of TEXT_FIELDS) {
    const value = body[key];
    if (typeof value === "string") data[key] = value.slice(0, 10_000);
  }

  for (const key of LIST_FIELDS) {
    const value = body[key];
    if (Array.isArray(value)) {
      data[key] = value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim().slice(0, 300))
        .filter(Boolean)
        .slice(0, 60);
    }
  }

  for (const key of INT_FIELDS) {
    const value = body[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      data[key] = Math.floor(value);
    }
  }

  if (typeof body.isStipend === "boolean") data.isStipend = body.isStipend;

  if ("applicationDeadline" in body) {
    const raw = body.applicationDeadline;
    if (raw === null || raw === "") {
      data.applicationDeadline = null;
    } else if (typeof raw === "string") {
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Invalid application deadline" }, { status: 400 });
      }
      data.applicationDeadline = parsed;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updatable fields supplied" }, { status: 400 });
  }

  const updated = await prisma.job.update({
    where: { id },
    data: data as never,
    include: { company: { select: { name: true } } },
  });

  return NextResponse.json({ job: toClientJob(updated as never) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "employer" && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (user.role === "employer" && existing.createdBy !== user.id) {
    return NextResponse.json({ error: "Only the owning employer can delete this job" }, { status: 403 });
  }

  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}