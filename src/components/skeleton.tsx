import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-zinc-200/70", className)} />;
}

export function JobCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div className="flex-1">
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="mt-4 h-5 w-3/4" />
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="mt-4 h-4 w-28" />
      <div className="mt-4 flex gap-1.5">
        <Skeleton className="h-6 w-16 rounded-md" />
        <Skeleton className="h-6 w-20 rounded-md" />
        <Skeleton className="h-6 w-14 rounded-md" />
      </div>
      <div className="mt-5 flex gap-2 border-t border-zinc-100 pt-4">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

export function CompanyCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
      <div className="flex justify-between">
        <Skeleton className="h-14 w-14 rounded-xl" />
      </div>
      <Skeleton className="mt-4 h-5 w-32" />
      <Skeleton className="mt-2 h-3 w-20" />
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-4/5" />
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-6">
      <Skeleton className="h-8 w-8 rounded-lg" />
      <Skeleton className="mt-3 h-7 w-16" />
      <Skeleton className="mt-1 h-3 w-24" />
    </div>
  );
}