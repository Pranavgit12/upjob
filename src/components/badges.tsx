import { BadgeCheck, ShieldCheck, Sparkles, Link2 } from "lucide-react";
import type { Company } from "@/types";

export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-100">
      <BadgeCheck className="h-3 w-3" />
      Verified
    </span>
  );
}

export function PartnerBadge({ tooltip = true }: { tooltip?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100"
      title={tooltip ? "Verified partnership with UpJob" : undefined}
    >
      <ShieldCheck className="h-3 w-3" />
      Partner
    </span>
  );
}

export function FeaturedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white">
      <Sparkles className="h-3 w-3" />
      Featured
    </span>
  );
}

export function OnUpJobBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
      <Link2 className="h-3 w-3" />
      On UpJob
    </span>
  );
}

export function HiringBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
      Hiring on UpJob
    </span>
  );
}

export function CompanyBadgeSet({ company }: { company: Company }) {
  if (company.isPartner) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <PartnerBadge />
        {company.isVerified && <VerifiedBadge />}
        {company.isFeatured && <FeaturedBadge />}
      </div>
    );
  }
  if (company.hiringStatus === "hiring") {
    return <HiringBadge />;
  }
  if (company.isVerified) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <VerifiedBadge />
      </div>
    );
  }
  return <OnUpJobBadge />;
}