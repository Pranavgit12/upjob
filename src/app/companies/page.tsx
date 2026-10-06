import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Search } from "lucide-react";
import { getCompanies } from "@/lib/db-data";
import { CompanyCard } from "@/components/company-card";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Paginated and filtered listings are request-specific; rendering them at build
// time would also require a live database.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore Companies",
  description:
    "Explore companies on UpJob. Discover startups, growing companies and leading enterprises across every industry.",
};

const PER_PAGE = 20;

const INDUSTRIES = [
  "All",
  "Technology",
  "Fintech",
  "E-commerce",
  "Consulting",
  "IT Services",
  "Telecom",
  "Automotive",
  "Retail",
  "Media",
  "SaaS",
  "Software",
  "Banking",
  "Finance",
  "Quick Commerce",
  "EdTech",
  "Mobility",
  "Electric Vehicles",
];

const SIZES = ["All", "Startup", "1,001-5,000", "5,001-10,000", "10,001+"];

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.toLowerCase() : "";
  const industry = typeof params.industry === "string" ? params.industry : "";
  const size = typeof params.size === "string" ? params.size : "";
  const hiringOnly = params.hiring === "1";
  const internshipAvailable = params.internships === "1";
  const page = Math.max(1, Number(params.page) || 1);

  const companies = await getCompanies();

  const filtered = companies.filter((c) => {
    if (q) {
      const haystack = `${c.name} ${c.industry} ${c.location} ${c.description} ${c.specialties?.join(" ") ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (industry !== "All" && industry && c.industry !== industry) return false;
    if (size !== "All" && size && c.companySize !== size) return false;
    if (hiringOnly && c.hiringStatus !== "hiring") return false;
    if (internshipAvailable && !c.internshipAvailable) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-zinc-100 bg-zinc-50/50">
        <div className="container-upjob py-12">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
              <Building2 className="h-3.5 w-3.5" />
              {companies.length}+ companies
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Explore Companies
            </h1>
            <p className="mt-3 text-sm leading-7 text-zinc-500">
              Discover startups, growing companies and leading enterprises hiring on UpJob.
            </p>
          </div>

          <form action="/companies" className="mx-auto mt-8 flex max-w-xl gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search by company, industry or location"
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="accent">
              Search
            </Button>
          </form>
        </div>
      </div>

      <div className="container-upjob flex-1 py-8">
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((ind) => (
              <Link
                key={ind}
                href={ind === "All" ? "/companies" : `/companies?industry=${encodeURIComponent(ind)}`}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  ((ind === "All" && !industry) || industry === ind)
                    ? "bg-black text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {ind}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <Link
                  key={s}
                  href={s === "All" ? "/companies" : `/companies?size=${encodeURIComponent(s)}`}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    ((s === "All" && !size) || size === s)
                      ? "bg-zinc-900 text-white"
                      : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  {s}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Link
                href={hiringOnly ? "/companies" : "/companies?hiring=1"}
                className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900"
                aria-pressed={hiringOnly}
              >
                <input type="checkbox" checked={hiringOnly} readOnly className="h-4 w-4 rounded accent-black" />
                Hiring only
              </Link>
              <Link
                href={internshipAvailable ? "/companies" : "/companies?internships=1"}
                className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900"
                aria-pressed={internshipAvailable}
              >
                <input type="checkbox" checked={internshipAvailable} readOnly className="h-4 w-4 rounded accent-black" />
                Has internships
              </Link>
            </div>
          </div>
        </div>

        <p className="mb-5 text-sm text-zinc-500">
          Showing <span className="font-medium text-zinc-800">{filtered.length}</span> companies
        </p>

        {filtered.length === 0 ? (
          <EmptyState
            title="No companies found"
            description="Try a different search or clear your filters."
            actionLabel="View all companies"
            actionHref="/companies"
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pageItems.map((company) => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} className="mt-10" />
          </>
        )}
      </div>
    </div>
  );
}