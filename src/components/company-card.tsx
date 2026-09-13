import Link from "next/link";
import { MapPin, Users, ArrowUpRight } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { CompanyBadgeSet } from "@/components/badges";
import type { Company } from "@/types";

export function CompanyCard({ company }: { company: Company }) {
  return (
    <Link
      href={`/companies/${company.slug}`}
      className="group relative flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-zinc-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <CompanyLogo name={company.name} size="lg" className="rounded-xl" />
        <ArrowUpRight className="h-4 w-4 text-zinc-300 transition-colors group-hover:text-zinc-600" />
      </div>

      <h3 className="mt-4 flex items-center gap-1.5 text-base font-semibold text-zinc-900">
        {company.name}
      </h3>

      <div className="mt-1">
        <CompanyBadgeSet company={company} />
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-500">{company.description}</p>

      <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {company.location}
        </span>
        <span className="text-zinc-300">•</span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {company.companySize}
        </span>
      </div>
    </Link>
  );
}