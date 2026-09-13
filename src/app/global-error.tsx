"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void error;
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50">
            <TriangleAlert className="h-9 w-9 text-red-500" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-zinc-900">
            Something went wrong
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-500">
            An unexpected error occurred. Please try again — if it keeps happening, contact support.
          </p>
          <div className="mt-8 flex gap-3">
            <button
              onClick={reset}
              className="rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded-lg border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}