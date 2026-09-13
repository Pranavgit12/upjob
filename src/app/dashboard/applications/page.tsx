"use client";

import * as React from "react";
import Link from "next/link";
import { FileText, Search } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { fetchApplications } from "@/lib/client-data";
import { cn } from "@/lib/utils";
import type { Application } from "@/types";

export default function ApplicationsPage() {
  const [applications, setApplications] = React.useState<Application[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    fetchApplications().then((apps) => {
      if (!mounted) return;
      setApplications(apps);
      setLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!loaded) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Applications</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Track the status of every job you&apos;ve applied to.
        </p>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Your submitted applications will appear here with their live status."
          icon={FileText}
          actionLabel="Find jobs to apply"
          actionHref="/jobs"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.5fr_1fr_1fr_0.5fr] gap-4 border-b border-zinc-100 bg-zinc-50/50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 md:grid">
            <span>Job</span>
            <span>Applied</span>
            <span>Status</span>
            <span />
          </div>
          <div className="divide-y divide-zinc-50">
            {applications.map((app) => (
              <div
                key={app.id}
                className="grid grid-cols-1 gap-3 px-6 py-5 transition-colors hover:bg-zinc-50/50 md:grid-cols-[1.5fr_1fr_1fr_0.5fr] md:items-center md:gap-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/jobs/${app.jobId}`}
                    className="line-clamp-1 text-sm font-semibold text-zinc-900 hover:text-blue-600"
                  >
                    {app.jobTitle}
                  </Link>
                  <p className="mt-0.5 text-xs text-zinc-500">{app.companyName}</p>
                </div>
                <p className="text-xs text-zinc-500">{app.appliedDate}</p>
                <div>
                  <StatusBadge status={app.status} />
                </div>
                <Link
                  href={`/jobs/${app.jobId}`}
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                  )}
                >
                  <Search className="h-3 w-3" />
                  View job
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}