import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/types";

const statusVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1",
  {
    variants: {
      status: {
        Applied: "bg-zinc-50 text-zinc-600 ring-zinc-200",
        "Under Review": "bg-blue-50 text-blue-700 ring-blue-200",
        Shortlisted: "bg-violet-50 text-violet-700 ring-violet-200",
        Interview: "bg-amber-50 text-amber-700 ring-amber-200",
        Selected: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        Rejected: "bg-red-50 text-red-700 ring-red-200",
      },
    },
    defaultVariants: {
      status: "Applied",
    },
  }
);

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={cn(statusVariants({ status }))}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export type { VariantProps };