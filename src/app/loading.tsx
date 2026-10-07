export default function Loading() {
  return (
    <main
      className="flex flex-1 flex-col"
      aria-busy="true"
      aria-label="Loading page"
    >
      <span className="sr-only">Loading page…</span>
      <div className="h-16 border-b border-zinc-200/70 bg-white" />
      <section className="border-b border-zinc-100 bg-zinc-50 py-20 md:py-28">
        <div className="container-upjob mx-auto flex max-w-4xl flex-col items-center px-4">
          <div className="h-6 w-48 animate-pulse rounded-full bg-zinc-200" />
          <div className="mt-6 h-12 w-full max-w-2xl animate-pulse rounded-xl bg-zinc-200 sm:h-16" />
          <div className="mt-4 h-5 w-3/4 max-w-xl animate-pulse rounded bg-zinc-200" />
          <div className="mt-10 h-16 w-full animate-pulse rounded-2xl bg-zinc-200" />
        </div>
      </section>
      <section className="container-upjob mx-auto w-full px-4 py-16">
        <div className="mx-auto h-8 w-56 animate-pulse rounded bg-zinc-200" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-52 animate-pulse rounded-2xl border border-zinc-200/80 bg-white"
            />
          ))}
        </div>
      </section>
    </main>
  );
}
