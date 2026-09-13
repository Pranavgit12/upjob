import Link from "next/link";
import { SearchX } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <Navbar />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-100">
          <SearchX className="h-9 w-9 text-zinc-400" />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-zinc-400">Error 404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
          This page can&apos;t be found
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-500">
          The page you&apos;re looking for may have been removed or never existed.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild>
            <Link href="/">Back to Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/jobs">Browse Jobs</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}