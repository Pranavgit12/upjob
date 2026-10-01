import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  Users,
  Globe,
  Calendar,
  ArrowLeft,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { getCompanyBySlug, getCompanies } from "@/lib/db-data";
import { getJobsByCompany } from "@/lib/db-data";
import { CompanyLogo } from "@/components/company-logo";
import { JobCard } from "@/components/job-card";
import { CompanyBadgeSet } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Rendered per-request rather than prerendered. `generateStaticParams` used to
// live here, but it forced `next build` to reach the production database — which
// breaks container builds that have no DB access. Pass a live `DATABASE_URL` at
// build time if you want to reintroduce build-time generation.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) return { title: "Company not found" };
  return {
    title: `${company.name} — Company Profile`,
    description: `${company.description} Explore open roles and internships at ${company.name} on UpJob.`,
  };
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) notFound();

  const jobs = await getJobsByCompany(company.id);
  const related = (await getCompanies())
    .filter((c) => c.industry === company.industry && c.id !== company.id)
    .slice(0, 4);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50/50">
      <div className="border-b border-zinc-100 bg-white">
        <div className="container-upjob flex flex-wrap items-center justify-between gap-3 py-4">
          <Link
            href="/companies"
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to companies
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-zinc-200 bg-gradient-to-b from-white to-zinc-50">
        <div className="container-upjob py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <CompanyLogo name={company.name} size="xl" className="rounded-2xl" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                    {company.name}
                  </h1>
                  <CompanyBadgeSet company={company} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-500">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {company.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {company.companySize} employees
                  </span>
                  {company.founded && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      Founded {company.founded}
                    </span>
                  )}
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:underline"
                    >
                      <Globe className="h-4 w-4" />
                      {company.website.replace("https://", "")}
                    </a>
                  )}
                </div>
              </div>
            </div>
            <Button asChild size="lg" className="sm:mt-8">
              <Link href={jobs.length > 0 ? `#open-roles` : "/jobs"}>
                View Open Jobs
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container-upjob py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-10">
            <section>
              <h2 className="text-lg font-semibold text-zinc-900">About {company.name}</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-600">{company.description}</p>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm">
                  <p className="text-xs text-zinc-400">Industry</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">{company.industry}</p>
                </div>
                <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm">
                  <p className="text-xs text-zinc-400">Headquarters</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">{company.headquarters ?? company.location}</p>
                </div>
                <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm">
                  <p className="text-xs text-zinc-400">Company size</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">{company.companySize}</p>
                </div>
                <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm">
                  <p className="text-xs text-zinc-400">Founded</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">{company.founded ?? "—"}</p>
                </div>
              </div>
            </section>

            {jobs.length > 0 && (
              <section id="open-roles">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-zinc-900">
                    Open positions{" "}
                    <Badge variant="accent" className="ml-1">{jobs.length}</Badge>
                  </h2>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                  {jobs.map((job) => (
                    <JobCard key={job.id} job={job} showApply={false} />
                  ))}
                </div>
              </section>
            )}

            {company.specialties && company.specialties.length > 0 && (
              <section className="clear-both">
                <h2 className="text-lg font-semibold text-zinc-900">Focus areas</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {company.specialties.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside>
            <div className="space-y-4 lg:sticky lg:top-24">
              <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-zinc-900">Company at a glance</p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Industry</dt>
                    <dd className="font-medium text-zinc-800">{company.industry}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Location</dt>
                    <dd className="font-medium text-zinc-800">{company.location}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Size</dt>
                    <dd className="font-medium text-zinc-800">{company.companySize}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Status</dt>
                    <dd className="font-medium text-zinc-800">
                      {company.hiringStatus === "hiring" ? "Hiring" : "Open to applications"}
                    </dd>
                  </div>
                </dl>
                <Button asChild className="mt-5 w-full">
                  <Link href="/jobs">
                    View All Jobs
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-14 border-t border-zinc-200 pt-10">
            <h2 className="text-lg font-semibold text-zinc-900">Related companies</h2>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {related.map((c) => (
                <Link
                  key={c.id}
                  href={`/companies/${c.slug}`}
                  className="flex flex-col items-center rounded-2xl border border-zinc-200/80 bg-white p-5 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
                >
                  <CompanyLogo name={c.name} size="lg" />
                  <p className="mt-3 text-sm font-semibold text-zinc-900">{c.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">{c.industry}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}