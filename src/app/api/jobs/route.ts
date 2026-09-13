import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJobs, getOpenJobs, toClientJob } from "@/lib/db-data";
import { JobType, WorkMode } from "@prisma/client";

export const dynamic = "force-dynamic";

const TYPE_TO_ENUM: Record<string, string> = {
  "Full-time": "FULL_TIME",
  "Internship": "INTERNSHIP",
  "Part-time": "PART_TIME",
  "Contract": "CONTRACT",
};

const WORK_MODE_TO_ENUM: Record<string, string> = {
  "Remote": "REMOTE",
  "Hybrid": "HYBRID",
  "On-site": "ON_SITE",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "1";
  const companyId = searchParams.get("companyId");
  const mine = searchParams.get("mine") === "1";

  let jobs;
  if (mine) {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const rows = await prisma.job.findMany({
      where: user.role === "admin" ? {} : { createdBy: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { name: true, logo: true, isVerified: true } },
        _count: { select: { applications: true } },
      },
    });
    jobs = rows.map((r) => ({
      ...toClientJob(r as never),
      applications: r._count.applications,
      companyId: r.companyId,
    }));
  } else if (all) {
    jobs = await getJobs();
  } else if (companyId) {
    const rows = await prisma.job.findMany({
      where: { companyId, status: "OPEN" },
      orderBy: { createdAt: "desc" },
      include: { company: { select: { name: true } } },
    });
    jobs = rows.map((r) => toClientJob(r));
  } else {
    jobs = await getOpenJobs();
  }

  return NextResponse.json({ jobs });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "employer" && user.role !== "admin") {
    return NextResponse.json({ error: "Only employers can post jobs" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const salaryMin = Number(body.salaryMin);
  if (!title || !description || !Number.isFinite(salaryMin)) {
    return NextResponse.json({ error: "Title, description and minimum salary are required" }, { status: 400 });
  }

  let company;
  if (user.role === "employer") {
    const employer = await prisma.employer.findUnique({
      where: { userId: user.id },
      select: { companyId: true },
    });
    company = employer?.companyId ? { id: employer.companyId } : null;
  } else {
    company = String(body.companyId ?? "").trim() ? { id: String(body.companyId) } : null;
  }

  const companyId = company?.id?.trim();
  if (!companyId) {
    return NextResponse.json({ error: "No company linked to your account. Set up your company profile first." }, { status: 400 });
  }

  const skills = Array.isArray(body.skills) ? body.skills.map(String).slice(0, 12) : [];

  const job = await prisma.job.create({
    data: {
      title,
      companyId,
      category: String(body.category || "General").slice(0, 80),
      location: String(body.location || "Remote").slice(0, 120),
      type: (TYPE_TO_ENUM[String(body.type)] as JobType) ?? JobType.FULL_TIME,
      workMode: (WORK_MODE_TO_ENUM[String(body.workMode)] as WorkMode) ?? WorkMode.REMOTE,
      salaryMin,
      salaryMax: body.salaryMax ? Number(body.salaryMax) : null,
      isStipend: String(body.type) === "Internship",
      experience: String(body.experience || "0 - 1 year").slice(0, 80),
      skills,
      description,
      responsibilities: [],
      requirements: [],
      benefits: [],
      status: "OPEN",
      isModerated: true,
      vacancy: 1,
      createdBy: user.id,
    },
  });

  return NextResponse.json({ job: toClientJob({ ...job, company: null }) as never }, { status: 201 });
}