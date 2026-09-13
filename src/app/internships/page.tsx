import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Building2, Clock } from "lucide-react";
import { getInternships, getInternshipDomains } from "@/lib/db-data";
import { JobCard } from "@/components/job-card";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Internships",
  description:
    "Launch your career with the right internship. Discover paid and unpaid internships across software, design, marketing, data, finance and more on UpJob.",
};

export default async function InternshipsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.toLowerCase() : "";
  const domain = typeof params.domain === "string" ? params.domain : "";
  const mode = typeof params.mode === "string" ? params.mode : "";
  const paid = typeof params.paid === "string" ? params.paid : "";

  const internships = await getInternships();
  const domains = ["All", ...(await getInternshipDomains())];

  const filtered = internships.filter((i) => {
    if (q) {
      const company = i.job.companyName;
      const haystack = `${i.job.title} ${i.job.location} ${i.job.skills.join(" ")} ${i.domain} ${company ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (domain && i.domain !== domain) return false;
    if (mode && i.internshipType !== mode) return false;
    if (paid === "paid" && i.paid === false) return false;
    if (paid === "unpaid" && i.paid !== false) return false;
    return true;
  });

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-zinc-100 bg-gradient-to-b from-zinc-50 to-white">
        <div className="container-upjob py-14 text-center">
          <Badge variant="accent">Internships</Badge>
          <h1 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Launch your career with the right internship
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-zinc-500">
            Paid and unpaid internships across every domain — remote, hybrid and on-site.
            Filter by stipend, duration and work mode.
          </p>
          <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-2">
            {domains.map((d) => (
              <Link
                key={d}
                href={d === "All" ? "/internships" : `/internships?domain=${encodeURIComponent(d)}`}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  (d === "All" && !domain) || domain === d
                    ? "bg-black text-white shadow-sm"
                    : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
                }`}
              >
                {d}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="container-upjob flex-1 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">
            {filtered.length} internships available
          </p>
          <div className="flex flex-wrap gap-2">
            {["all", "paid", "unpaid"].map((p) => (
              <Link
                key={p}
                href={p === "all" ? "/internships" : `/internships?paid=${p}`}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  (p === "all" && !paid) || paid === p
                    ? "bg-black text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {p === "all" ? "All" : p === "paid" ? "Paid" : "Unpaid"}
              </Link>
            ))}
            {["Remote", "Hybrid", "On-site"].map((m) => (
              <Link
                key={m}
                href={`/internships?mode=${encodeURIComponent(m)}`}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  mode === m ? "bg-black text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {m}
              </Link>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No internships found"
            description="Try adjusting your filters or browse all internships."
            actionLabel="Browse all internships"
            actionHref="/internships"
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((i) => (
              <div key={i.job.id} className="relative">
                <JobCard job={i.job} />
                <div className="absolute right-5 top-[76px] flex gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-500 shadow-sm ring-1 ring-zinc-200">
                    <Clock className="h-3 w-3" />
                    {i.duration}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shadow-sm ring-1 ${
                      i.paid
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-zinc-50 text-zinc-500 ring-zinc-200"
                    }`}
                  >
                    <Briefcase className="h-3 w-3" />
                    {i.paid ? "Paid" : "Unpaid"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-500 shadow-sm ring-1 ring-zinc-200">
                    <Building2 className="h-3 w-3" />
                    {i.internshipType}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}