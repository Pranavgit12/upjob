import type { Metadata } from "next";
import { Suspense } from "react";
import { ListFilter } from "lucide-react";
import { getOpenJobListings } from "@/lib/db-data";
import { JobCard } from "@/components/job-card";
import { FilterSidebar } from "@/components/filter-sidebar";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/skeleton";
import type { JobListing } from "@/types";

export const metadata: Metadata = {
  title: "Jobs",
  description:
    "Browse jobs and internships from startups, growing companies and leading enterprises on UpJob.",
};

export const dynamic = "force-dynamic";

const PER_PAGE = 12;

function normalizeQuery(q: string): string {
  return q.toLowerCase().trim();
}

function matchesJob(job: JobListing, terms: string[]) {
  const haystack = [
    job.title,
    job.location,
    job.category,
    job.type,
    job.workMode,
    job.experience,
    job.company.name,
    job.company.industry,
    ...job.skills,
  ]
    .join(" ")
    .toLowerCase();
  return terms.every((t) => haystack.includes(t));
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const location = typeof params.location === "string" ? params.location : "";
  const category = typeof params.category === "string" ? params.category : "";
  const type = typeof params.type === "string" ? params.type : "";
  const workMode = typeof params.workMode === "string" ? params.workMode : "";
  const experience = typeof params.experience === "string" ? params.experience : "";
  const companyParam = typeof params.company === "string" ? params.company : "";
  const sort = typeof params.sort === "string" ? params.sort : "Most Relevant";
  const page = Math.max(1, Number(params.page) || 1);

  const types = type.split(",").filter(Boolean);
  const modes = workMode.split(",").filter(Boolean);

  const openJobs = await getOpenJobListings();

  let filtered = openJobs.filter((job) => {
    if (q) {
      const terms = normalizeQuery(q).split(/\s+/);
      if (!matchesJob(job, terms)) return false;
    }
    if (location && !job.location.toLowerCase().includes(location.toLowerCase())) return false;
    if (category && job.category.toLowerCase() !== category.toLowerCase()) return false;
    if (types.length && !types.includes(job.type)) return false;
    if (modes.length && !modes.includes(job.workMode)) return false;
    if (experience && job.experience !== experience) return false;
    if (companyParam && job.company.slug !== companyParam) return false;
    return true;
  });

  if (sort === "Latest") {
    filtered = [...filtered].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } else if (sort === "Salary: High to Low") {
    filtered = [...filtered].sort((a, b) => b.salaryMin - a.salaryMin);
  } else if (sort === "Salary: Low to High") {
    filtered = [...filtered].sort((a, b) => a.salaryMin - b.salaryMin);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-zinc-100 bg-zinc-50/50">
        <div className="container-upjob py-10">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            {q ? `Results for "${q}"` : "Find jobs"}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {filtered.length} {filtered.length === 1 ? "opportunity" : "opportunities"} found
            {q && (
              <>
                {" "}
                matching <span className="font-medium text-zinc-800">{q}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="container-upjob flex-1 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Suspense
              fallback={<Skeleton className="h-96 w-full max-w-[260px] rounded-2xl" />}
            >
              <FilterSidebar />
            </Suspense>
          </div>

          <div>
            {pageItems.length === 0 ? (
              <EmptyState
                title="No jobs found"
                description={
                  q
                    ? `We couldn't find any opportunities matching "${q}". Try a different search or filter.`
                    : "No opportunities match your current filters. Try adjusting them."
                }
                icon={ListFilter}
                actionLabel={q ? "Clear search" : "View all jobs"}
                actionHref={q ? "/jobs" : undefined}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {pageItems.map((job) => (
                <JobCard key={job.id} job={job} company={job.company} />
                  ))}
                </div>
                <Pagination page={page} totalPages={totalPages} className="mt-10" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
