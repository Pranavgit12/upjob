// Client-side fetch helpers backed by the public data API routes.
import type { Application, CandidateProfile, Company, Job } from "@/types";
import { INITIAL_PROFILE } from "@/lib/profile";
import { storeGet, STORAGE_KEYS } from "@/lib/store";

async function getJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok || res.status === 401) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchJobs(all = false): Promise<Job[]> {
  const url = all ? "/api/jobs?all=1" : "/api/jobs";
  return (await getJSON<{ jobs: Job[] }>(url))?.jobs ?? [];
}

export async function fetchJob(id: string): Promise<Job | null> {
  return (await getJSON<{ job: Job }>(`/api/jobs/${id}`))?.job ?? null;
}

export async function fetchCompanies(): Promise<Company[]> {
  return (await getJSON<{ companies: Company[] }>("/api/companies"))?.companies ?? [];
}

export async function fetchCompanyBySlug(slug: string): Promise<Company | null> {
  const companies = await fetchCompanies();
  return companies.find((c) => c.slug === slug) ?? null;
}

export async function fetchCompanyById(id: string): Promise<Company | null> {
  const companies = await fetchCompanies();
  return companies.find((c) => c.id === id) ?? null;
}

interface ApiApplication {
  id: string;
  status: string;
  createdAt: string;
  job: {
    id: string;
    title: string;
    type: string;
    company: { name: string; logo: string | null } | null;
    salaryMin: number;
    isStipend: boolean;
    location: string;
    workMode: string;
    skills: string[];
  };
  resume: { id: string; fileName: string; isPrimary: boolean } | null;
  interview: {
    token: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    currentStep: number;
    maxSteps: number;
    inviteUrl: string;
  } | null;
}

// The DB stores ApplicationStatus as SCREAMING_SNAKE_CASE (APPLIED,
// UNDER_REVIEW, …) while every UI component expects the display form
// ("Applied", "Under Review", …). Casting the raw enum straight onto the type
// made StatusBadge fall back to its default variant and rendered values like
// "SHORTLISTED", and left `status === "Interview"` filters matching nothing.
const STATUS_LABELS: Record<string, Application["status"]> = {
  APPLIED: "Applied",
  UNDER_REVIEW: "Under Review",
  SHORTLISTED: "Shortlisted",
  INTERVIEW: "Interview",
  SELECTED: "Selected",
  REJECTED: "Rejected",
};

export function toApplicationStatus(raw: unknown): Application["status"] {
  const key = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  const known = STATUS_LABELS[key];
  if (known) return known;
  if (!key) return "Applied";
  return key
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()) as Application["status"];
}

export async function fetchApplications(): Promise<Application[]> {
  const data = (await getJSON<{ applications: ApiApplication[] }>("/api/applications"))?.applications ?? [];
  return data.map((a) => ({
    id: a.id,
    jobId: a.job.id,
    jobTitle: a.job.title,
    companyId: "",
    companyName: a.job.company?.name ?? "",
    companyLogo: a.job.company?.logo ?? undefined,
    appliedDate: a.createdAt.slice(0, 10),
    status: toApplicationStatus(a.status),
  }));
}

export async function fetchProfile(): Promise<CandidateProfile> {
  return storeGet<CandidateProfile>(STORAGE_KEYS.profile, INITIAL_PROFILE);
}

export async function fetchSavedJobIds(): Promise<string[]> {
  return storeGet<string[]>(STORAGE_KEYS.savedJobs, []);
}
