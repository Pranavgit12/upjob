import { prisma } from "@/lib/prisma";
import type { Company, InternshipListing, Job, JobListing, JobType, WorkMode } from "@/types";

const TYPE_MAP: Record<string, JobType> = {
  INTERNSHIP: "Internship",
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
};

const WORK_MODE_MAP: Record<string, WorkMode> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ON_SITE: "On-site",
};

const STATUS_MAP: Record<string, "open" | "closed"> = {
  OPEN: "open",
  CLOSED: "closed",
};

// Public serializer used by API routes and the data layer.
export const toClientJob = toJob;

function mapType(type: string): JobType {
  return TYPE_MAP[type] ?? "Full-time";
}

function mapWorkMode(workMode: string): WorkMode {
  return WORK_MODE_MAP[workMode] ?? "On-site";
}

function mapStatus(status: string): "open" | "closed" {
  return STATUS_MAP[status] ?? "closed";
}

function toCompany(c: {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  industry: string;
  location: string;
  companySize: string;
  description: string;
  website: string | null;
  founded: string | null;
  headquarters: string | null;
  isPartner: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  hiringStatus: string;
}): Company {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    logo: c.logo ?? undefined,
    industry: c.industry,
    location: c.location,
    companySize: c.companySize,
    description: c.description,
    website: c.website ?? undefined,
    founded: c.founded ?? undefined,
    headquarters: c.headquarters ?? undefined,
    isPartner: c.isPartner,
    isVerified: c.isVerified,
    isFeatured: c.isFeatured,
    hiringStatus: (["hiring", "not-hiring", "unknown"].includes(c.hiringStatus) ? c.hiringStatus : "unknown") as Company["hiringStatus"],
  };
}

function toJob(
  j: {
    id: string;
    title: string;
    companyId: string;
    location: string;
    type: string;
    workMode: string;
    salaryMin: number;
    salaryMax: number | null;
    isStipend: boolean;
    experience: string;
    skills: string[];
    description: string;
    responsibilities: string[];
    requirements: string[];
    benefits: string[];
    status: string;
    category: string;
    createdAt: Date;
    applicationDeadline: Date | null;
    vacancy: number;
    company?: { name: string } | null;
  },
  extra?: Partial<Job>
): Job {
  return {
    id: j.id,
    title: j.title,
    companyId: j.companyId,
    companyName: j.company?.name ?? extra?.companyName,
    location: j.location,
    type: mapType(j.type),
    workMode: mapWorkMode(j.workMode),
    salaryMin: j.salaryMin,
    salaryMax: j.salaryMax,
    isStipend: j.isStipend,
    experience: j.experience,
    skills: j.skills,
    description: j.description,
    responsibilities: j.responsibilities,
    requirements: j.requirements,
    benefits: j.benefits,
    status: mapStatus(j.status),
    category: j.category,
    createdAt: j.createdAt.toISOString().slice(0, 10),
    applicationDeadline: j.applicationDeadline ? j.applicationDeadline.toISOString().slice(0, 10) : "Rolling",
    vacancy: j.vacancy,
    ...extra,
  };
}

const JOB_SELECT = {
  id: true,
  title: true,
  companyId: true,
  location: true,
  type: true,
  workMode: true,
  salaryMin: true,
  salaryMax: true,
  isStipend: true,
  experience: true,
  skills: true,
  description: true,
  responsibilities: true,
  requirements: true,
  benefits: true,
  status: true,
  category: true,
  createdAt: true,
  applicationDeadline: true,
  vacancy: true,
  company: { select: { name: true } },
} as const;

export async function getJobs(): Promise<Job[]> {
  const rows = await prisma.job.findMany({
    where: {},
    select: JOB_SELECT,
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => toJob(r as never));
}

export async function getOpenJobs(): Promise<Job[]> {
  const rows = await prisma.job.findMany({
    where: { status: "OPEN" },
    select: JOB_SELECT,
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => toJob(r as never));
}

export async function getOpenJobListings(): Promise<JobListing[]> {
  const rows = await prisma.job.findMany({
    where: { status: "OPEN" },
    select: {
      id: true,
      title: true,
      companyId: true,
      category: true,
      location: true,
      type: true,
      workMode: true,
      salaryMin: true,
      salaryMax: true,
      experience: true,
      skills: true,
      createdAt: true,
      company: { select: { name: true, industry: true, slug: true, isVerified: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    ...row,
    companyName: row.company.name,
    type: mapType(row.type),
    workMode: mapWorkMode(row.workMode),
    createdAt: row.createdAt.toISOString().slice(0, 10),
  }));
}

export async function getFeaturedJobs(count = 6): Promise<Job[]> {
  const rows = await prisma.job.findMany({
    where: { status: "OPEN" },
    select: JOB_SELECT,
    orderBy: [{ createdAt: "desc" }],
    take: count,
  });
  return rows.map((r) => toJob(r as never));
}

export async function getJobById(id: string): Promise<Job | null> {
  const row = await prisma.job.findUnique({
    where: { id },
    select: JOB_SELECT,
  });
  return row ? toJob(row as never) : null;
}

export async function getJobsByCompany(companyId: string): Promise<Job[]> {
  const rows = await prisma.job.findMany({
    where: { companyId, status: "OPEN" },
    select: JOB_SELECT,
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => toJob(r as never));
}

export async function getCompanies(): Promise<Company[]> {
  const rows = await prisma.company.findMany({
    orderBy: { name: "asc" },
  });
  return rows.map((r) => toCompany(r as never));
}

export async function getCompanyIndex(): Promise<Array<{ name: string; slug: string }>> {
  return prisma.company.findMany({
    select: { name: true, slug: true },
    orderBy: { name: "asc" },
  });
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const row = await prisma.company.findUnique({ where: { id } });
  return row ? toCompany(row as never) : null;
}

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const row = await prisma.company.findUnique({ where: { slug } });
  return row ? toCompany(row as never) : null;
}

export async function getFeaturedCompanies(): Promise<Company[]> {
  const rows = await prisma.company.findMany({
    where: { isFeatured: true },
    orderBy: { name: "asc" },
    take: 8,
  });
  return rows.map((r) => toCompany(r as never));
}

export async function getJobCategoryCounts(): Promise<Record<string, number>> {
  const rows = await prisma.job.groupBy({
    by: ["category"],
    where: { status: "OPEN" },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.category, r._count._all]));
}

export async function getOpenJobCount(): Promise<number> {
  return prisma.job.count({ where: { status: "OPEN" } });
}

export interface InternshipItem {
  job: Job;
  domain: string;
  internshipType: WorkMode;
  paid: boolean;
  duration: string;
}

export async function getInternships(): Promise<InternshipItem[]> {
  const rows = await prisma.job.findMany({
    where: { status: "OPEN", type: "INTERNSHIP" },
    select: JOB_SELECT,
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => {
    const job = toJob(r as never);
    return {
      job,
      domain: job.category || "General",
      internshipType: job.workMode,
      paid: job.salaryMin > 0,
      duration: "3 months",
    };
  });
}

export async function getInternshipListings(): Promise<InternshipListing[]> {
  const rows = await prisma.job.findMany({
    where: { status: "OPEN", type: "INTERNSHIP" },
    select: {
      id: true,
      title: true,
      companyId: true,
      category: true,
      location: true,
      type: true,
      workMode: true,
      salaryMin: true,
      salaryMax: true,
      experience: true,
      skills: true,
      company: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    job: {
      id: row.id,
      title: row.title,
      companyId: row.companyId,
      companyName: row.company.name,
      location: row.location,
      type: mapType(row.type),
      workMode: mapWorkMode(row.workMode),
      salaryMin: row.salaryMin,
      salaryMax: row.salaryMax,
      experience: row.experience,
      skills: row.skills,
    },
    domain: row.category || "General",
    internshipType: mapWorkMode(row.workMode),
    paid: row.salaryMin > 0,
    duration: "3 months",
  }));
}

export async function getInternshipDomains(): Promise<string[]> {
  const rows = await prisma.job.findMany({
    where: { status: "OPEN", type: "INTERNSHIP" },
    select: { category: true },
    distinct: ["category"],
  });
  return rows.map((r) => r.category).filter(Boolean);
}
