import Link from "next/link";
import { MapPin, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CompanyLogo } from "@/components/company-logo";
import { SaveButton } from "@/components/save-button";
import { formatSalary, cn } from "@/lib/utils";
import type { Company, JobCardData } from "@/types";

export function JobCard({
  job,
  showApply = true,
  company,
}: {
  job: JobCardData;
  showApply?: boolean;
  company?: Pick<Company, "name" | "isVerified">;
}) {
  const companyName = company?.name ?? job.companyName;
  const isStipend = job.type === "Internship";

  return (
    <div className="group relative flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md">
      <div className="flex items-start gap-3">
        {companyName && <CompanyLogo name={companyName} size="md" />}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            {companyName}
            {company?.isVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-blue-600" />}
          </p>
          <Link href={`/jobs/${job.id}`} className="mt-1 block">
            <h3 className="line-clamp-1 text-base font-semibold text-zinc-900 transition-colors group-hover:text-blue-600">
              {job.title}
            </h3>
          </Link>
        </div>
        <SaveButton jobId={job.id} variant="icon" />
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
        <Badge variant={job.type === "Internship" ? "accent" : "success"} className="capitalize">
          {job.type}
        </Badge>
        <Badge variant="outline">{job.workMode}</Badge>
        <span className="inline-flex min-w-0 items-center gap-1">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{job.location}</span>
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-base font-semibold text-zinc-900">
          {formatSalary(job.salaryMin, job.salaryMax, isStipend)}
          <span className="ml-1 text-xs font-normal text-zinc-400">· {job.experience}</span>
        </p>
        {showApply && (
          <Link
            href={`/jobs/${job.id}`}
            className={cn(
              "inline-flex shrink-0 items-center rounded-lg bg-black px-3.5 py-1.5 text-sm font-medium text-white transition-all hover:bg-zinc-800 active:scale-[0.98]"
            )}
          >
            View
          </Link>
        )}
      </div>
    </div>
  );
}
