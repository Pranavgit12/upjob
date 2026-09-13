import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  Briefcase,
  CheckCircle2,
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  Users,
} from "lucide-react";
import { getJobById, getJobsByCompany, getJobs } from "@/lib/db-data";
import { getCompanyById } from "@/lib/db-data";
import { CompanyLogo } from "@/components/company-logo";
import { Badge } from "@/components/ui/badge";
import { JobCard } from "@/components/job-card";
import { JobActionSidebar } from "@/components/job-action-sidebar";
import { CompanyBadgeSet } from "@/components/badges";
import { formatSalary } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await getJobById(id);
  if (!job) return { title: "Job not found" };
  const company = await getCompanyById(job.companyId);
  return {
    title: `${job.title} at ${company?.name ?? "Company"}`,
    description: `${job.title} at ${company?.name ?? "Company"} — ${job.location}. Skills: ${job.skills.join(", ")}. Apply on UpJob.`,
    openGraph: {
      title: `${job.title} at ${company?.name ?? "Company"}`,
      description: `${job.type} • ${job.location} • ${formatSalary(job.salaryMin, job.salaryMax, job.type === "Internship")}`,
    },
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJobById(id);
  if (!job) notFound();

  const [company, similarJobs, companyJobsCount] = await Promise.all([
    getCompanyById(job.companyId),
    (await getJobs())
      .filter((j) => j.status === "open" && j.id !== job.id && j.category === job.category)
      .slice(0, 3),
    getJobsByCompany(job.companyId).then((j) => j.length),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50/50">
      <div className="border-b border-zinc-100 bg-white">
        <div className="container-upjob flex flex-wrap items-center justify-between gap-3 py-4">
          <Link
            href="/jobs"
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to jobs
          </Link>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            {company && (
              <Link href={`/companies/${company.slug}`} className="hover:text-zinc-700">
                View company profile
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="container-upjob py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          {/* Main content */}
          <div className="min-w-0">
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  {company && <CompanyLogo name={company.name} size="xl" className="rounded-2xl" />}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={job.type === "Internship" ? "accent" : "success"} className="capitalize">
                        {job.type}
                      </Badge>
                      <Badge variant="outline">{job.workMode}</Badge>
                    </div>
                    <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                      {job.title}
                    </h1>
                    {company && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Link
                          href={`/companies/${company.slug}`}
                          className="text-sm font-medium text-zinc-600 hover:text-blue-600"
                        >
                          {company.name}
                        </Link>
                        <CompanyBadgeSet company={company} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-zinc-50 p-5 sm:grid-cols-3 lg:grid-cols-4">
                <div>
                  <p className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <MapPin className="h-3.5 w-3.5" />
                    Location
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-800">{job.location}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <Briefcase className="h-3.5 w-3.5" />
                    Experience
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-800">{job.experience}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <Users className="h-3.5 w-3.5" />
                    Open positions
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-800">{job.vacancy ?? 1}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Deadline
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-800">{job.applicationDeadline}</p>
                </div>
              </div>

              {/* Sticky sidebar mobile */}
              <div className="mt-6 rounded-xl bg-zinc-50 p-4 lg:hidden">
                <JobActionSidebar
                  jobId={job.id}
                  jobTitle={job.title}
                  companyName={company?.name ?? "Company"}
                  companyId={job.companyId}
                  deadline={job.applicationDeadline}
                />
              </div>

              <div className="mt-8 border-t border-zinc-100 pt-6">
                <dl className="space-y-6">
                  <div>
                    <dt className="text-lg font-semibold text-zinc-900">
                      {formatSalary(job.salaryMin, job.salaryMax, job.type === "Internship")}
                    </dt>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-zinc-900">About this role</dt>
                    <dd className="mt-2 text-sm leading-7 text-zinc-600">{job.description}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-zinc-900">Responsibilities</dt>
                    <dd className="mt-3 space-y-2.5">
                      {job.responsibilities.map((r) => (
                        <p key={r} className="flex gap-2.5 text-sm leading-6 text-zinc-600">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50">
                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                          </span>
                          {r}
                        </p>
                      ))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-zinc-900">Requirements</dt>
                    <dd className="mt-3 space-y-2.5">
                      {job.requirements.map((r) => (
                        <p key={r} className="flex gap-2.5 text-sm leading-6 text-zinc-600">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          </span>
                          {r}
                        </p>
                      ))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-zinc-900">Required skills</dt>
                    <dd className="mt-3 flex flex-wrap gap-2">
                      {job.skills.map((s) => (
                        <span
                          key={s}
                          className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700"
                        >
                          {s}
                        </span>
                      ))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-zinc-900">Benefits</dt>
                    <dd className="mt-3 space-y-2.5">
                      {job.benefits.map((b) => (
                        <p key={b} className="flex gap-2.5 text-sm leading-6 text-zinc-600">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-50">
                            <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                          </span>
                          {b}
                        </p>
                      ))}
                    </dd>
                  </div>

                  {company && (
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-5">
                      <dt className="text-sm font-semibold text-zinc-900">About {company.name}</dt>
                      <dd className="mt-2 text-sm leading-7 text-zinc-600">{company.description}</dd>
                      {company.website && (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
                        >
                          Visit website
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>

          {/* Sticky sidebar */}
          <aside className="hidden lg:block">
            <div className="lg:sticky lg:top-24">
              <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
                <JobActionSidebar
                  jobId={job.id}
                  jobTitle={job.title}
                  companyName={company?.name ?? "Company"}
                  companyId={job.companyId}
                  deadline={job.applicationDeadline}
                />
              </div>
              {company && (
                <Link href={`/companies/${company.slug}`}>
                  <div className="mt-4 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md">
                    <CompanyLogo name={company.name} size="md" />
                    <p className="mt-3 text-sm font-semibold text-zinc-900">{company.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {company.industry} • {company.companySize}
                    </p>
                    <p className="mt-3 text-xs font-medium text-blue-600">
                      {companyJobsCount} open {companyJobsCount === 1 ? "position" : "positions"} →
                    </p>
                  </div>
                </Link>
              )}
            </div>
          </aside>
        </div>

        {similarJobs.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">Similar jobs</h2>
            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
              {similarJobs.map((j) => (
                <JobCard key={j.id} job={j} showApply={false} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}