export default function DashboardLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading dashboard">
      <span className="sr-only">Loading dashboard…</span>
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-200" />
        <div className="h-4 w-64 animate-pulse rounded bg-zinc-100" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl bg-white ring-1 ring-zinc-200" />
        ))}
      </div>
      <div className="h-32 animate-pulse rounded-2xl bg-white ring-1 ring-zinc-200" />
      <div className="h-72 animate-pulse rounded-2xl bg-white ring-1 ring-zinc-200" />
    </div>
  );
}
