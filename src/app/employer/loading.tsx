export default function EmployerLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading recruiter dashboard">
      <span className="sr-only">Loading recruiter dashboard…</span>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-zinc-200" />
          <div className="h-4 w-56 animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-lg bg-zinc-200" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl bg-white ring-1 ring-zinc-200" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-white ring-1 ring-zinc-200" />
    </div>
  );
}
