import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toClientJob } from "@/lib/db-data";
import { JobStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.status === "string") {
    const status = body.status.toLowerCase();
    if (status === "open") data.status = JobStatus.OPEN;
    else if (status === "closed") data.status = JobStatus.CLOSED;
    else if (status === "draft") data.status = JobStatus.DRAFT;
    else return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (typeof body.isModerated === "boolean") {
    data.isModerated = body.isModerated;
  }
  for (const [key, value] of Object.entries(body)) {
    if (key === "id" || key === "status" || key === "companyId" || key === "createdAt") continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      data[key] = value;
    }
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