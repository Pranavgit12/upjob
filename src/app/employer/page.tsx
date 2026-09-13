import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  Users,
  Star,
  Video,
  BadgeCheck,
  Rocket,
  ArrowRight,
  Plus,
  Building2,
  Sparkles,
} from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompanyLogo } from "@/components/company-logo";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toClientJob } from "@/lib/db-data";

export const metadata: Metadata = {
  title: "Employer Dashboard",
  description:
    "Post jobs, review applications, shortlist candidates and schedule interviews on UpJob's employer dashboard.",
};

export const dynamic = "force-dynamic";

export default async function EmployerPage() {
  const user = await getSessionUser();

  const employer = user
    ? await prisma.employer.findUnique({
        where: { userId: user.id },
        select: { company: true },
      })
    : null;

  const company = employer?.company ?? null;

  const ownJobIds = company
    ? (
        await prisma.job.findMany({
          where: { companyId: company.id },
          select: { id: true },
        })
      ).map((j) => j.id)
    : [];

  const allMyJobsPromise = user
    ? prisma.job.findMany({
        where: user.role === "admin" ? {} : { id: { in: ownJobIds } },
        select: {
          id: true,
          title: true,
          location: true,
          createdAt: true,
          applicationDeadline: true,
          status: true,
          companyId: true,
          company: { select: { name: true, logo: true, isVerified: true } },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      })
    : Promise.resolve([]);

  const [openRows, shortlistedCount, interviewCount] = await Promise.all([
    allMyJobsPromise,
    ownJobIds.length
      ? prisma.application.count({
          where: { jobId: { in: ownJobIds }, status: { in: ["SHORTLISTED", "INTERVIEW"] } },
        })
      : Promise.resolve(0),
    ownJobIds.length
      ? prisma.aiInterview.count({
          where: { application: { jobId: { in: ownJobIds } } },
        })
      : Promise.resolve(0),
  ]);

  const activeJobs = openRows.length;
  const applications = openRows.reduce((sum, j) => sum + j._count.applications, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {company ? `${company.name} · Recruiter Dashboard` : "Recruiter Dashboard"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Post jobs and connect with the right talent.
          </p>
        </div>
        <Button asChild>
          <a href={company ? "/employer/jobs?new=1" : "/employer/company"}>
            <Plus className="h-4 w-4" />
            Post a Job
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Active Jobs" value={activeJobs} icon={FileText} />
        <StatsCard title="Applications" value={applications} icon={Users} />
        <StatsCard title="Shortlisted" value={shortlistedCount} icon={Star} />
        <StatsCard title="Interviews" value={interviewCount} icon={Video} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Company onboarding */}
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-zinc-900">Company profile</h2>
            {company && (
              <Link href="/employer/company" className="text-sm font-medium text-blue-600 hover:underline">
                Manage →
              </Link>
            )}
          </div>
          {company ? (
            <div className="mt-5 flex flex-col gap-4 rounded-xl bg-zinc-950 p-6 text-white sm:flex-row sm:items-center">
              <CompanyLogo name={company.name} size="lg" className="rounded-2xl bg-white/10 ring-1 ring-white/20" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-white">{company.name}</p>
                  {company.isVerified && (
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-400 ring-1 ring-emerald-500/30">
                      Verified on UpJob
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-zinc-400 line-clamp-1">{company.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {[company.location, `${company.companySize} employees`, company.industry]
                    .filter(Boolean)
                    .map((t) => (
                      <span key={t} className="rounded-full bg-white/10 px-2.5 py-1 text-zinc-300 ring-1 ring-white/15">
                        {t}
                      </span>
                    ))}
                </div>
              </div>
              <Link
                href="/employer/jobs?new=1"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-opacity hover:opacity-90"
              >
                <Rocket className="h-4 w-4" />
                Post a Job
              </Link>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-4 rounded-xl bg-zinc-50 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-zinc-200">
                  <Building2 className="h-6 w-6 text-zinc-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Set up your company profile</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    Add your company details so candidates know who they&apos;re applying to — then start posting jobs.
                  </p>
                </div>
              </div>
              <Link
                href="/employer/company"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                <Sparkles className="h-4 w-4" />
                Set up company
              </Link>
            </div>
          )}
        </section>

        {/* Verification status */}
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">Verification</h2>
          {company ? (
            company.isVerified ? (
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Company verified</p>
                  <p className="mt-1 text-xs leading-5 text-emerald-700">
                    Your company has passed verification, giving your postings more trust with candidates.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-sm font-semibold text-zinc-700">Verification pending</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Your company profile is live. Verification is reviewed by the UpJob team.
                  </p>
                </div>
              </div>
            )
          ) : (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
              <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
              <div>
                <p className="text-sm font-semibold text-zinc-700">No company yet</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Link your company profile to start posting jobs and get verified.
                </p>
              </div>
            </div>
          )}
          {company && (
            <Link
              href="/employer/company"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
            >
              Manage company
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </section>
      </div>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-zinc-900">
            {user?.role === "admin" ? "Your recent postings" : "Your recent postings"}
          </h2>
          <Link href="/employer/jobs" className="text-sm font-medium text-blue-600 hover:underline">
            Manage all jobs →
          </Link>
        </div>
        {activeJobs === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-zinc-200 bg-white p-10 text-center">
            <p className="text-sm font-medium text-zinc-700">No job postings yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
              Post your first job and start receiving applications from candidates on UpJob.
            </p>
            <Button asChild className="mt-5">
              <a href="/employer/jobs?new=1">
                <Plus className="h-4 w-4" />
                Post a Job
              </a>
            </Button>
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50/50 text-xs uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Job</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Applications</th>
                  <th className="px-6 py-3 font-semibold hidden md:table-cell">Posted</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {openRows.map((job) => {
                  const jobView = toClientJob(job as never);
                  return (
                    <tr key={job.id} className="transition-colors hover:bg-zinc-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <CompanyLogo name={job.company?.name ?? ""} size="sm" />
                          <div>
                            <p className="font-medium text-zinc-900">{job.title}</p>
                            <p className="text-xs text-zinc-500">
                              {job.company?.name} · {job.location}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="success">Open</Badge>
                      </td>
                      <td className="px-6 py-4 text-zinc-600">{job._count.applications}</td>
                      <td className="hidden px-6 py-4 text-zinc-500 md:table-cell">{jobView.createdAt}</td>
                      <td className="px-6 py-4">
                        <Link href="/employer/applications" className="text-xs font-medium text-blue-600 hover:underline">
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="rounded-2xl bg-zinc-950 p-8 text-white">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="max-w-lg">
            <h2 className="text-xl font-bold">Hiring made effortless</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Reach thousands of students and professionals actively looking for internships and jobs
              on UpJob — in one place.
            </p>
          </div>
          <Button asChild className="bg-white text-zinc-900 hover:bg-zinc-100">
            <a href="/employer/jobs?new=1">Post a Job</a>
          </Button>
        </div>
      </div>
    </div>
  );
}