"use client";

import * as React from "react";
import { Bookmark } from "lucide-react";
import { JobCard } from "@/components/job-card";
import { EmptyState } from "@/components/empty-state";
import { storeSet, STORAGE_KEYS } from "@/lib/store";
import { fetchJobs, fetchSavedJobIds } from "@/lib/client-data";
import type { Job } from "@/types";

export default function SavedJobsPage() {
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    Promise.all([fetchSavedJobIds(), fetchJobs()]).then(([ids, allJobs]) => {
      if (!mounted) return;
      setJobs(allJobs.filter((j) => ids.includes(j.id)));
      setLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const removeAll = () => {
    storeSet(STORAGE_KEYS.savedJobs, []).then(() => setJobs([]));
  };

  if (!loaded) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-100" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-zinc-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Saved Jobs</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Keep track of opportunities you want to revisit later.
          </p>
        </div>
        {jobs.length > 0 && (
          <button
            onClick={removeAll}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-red-600"
          >
            Clear all
          </button>
        )}
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          title="No saved jobs yet"
          description="Tap the bookmark icon on any job to save it here for later."
          icon={Bookmark}
          actionLabel="Browse jobs"
          actionHref="/jobs"
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} showApply={false} />
          ))}
        </div>
      )}
    </div>
  );
}