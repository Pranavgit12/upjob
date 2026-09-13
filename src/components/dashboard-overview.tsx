"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  Video,
  Bookmark,
  UserRound,
  ArrowRight,
  Sparkles,
  CalendarClock,
  ChevronRight,
} from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { JobCard } from "@/components/job-card";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { calculateProfileCompletion } from "@/lib/profile";
import { INITIAL_PROFILE } from "@/lib/profile";
import { fetchApplications, fetchJobs, fetchProfile, fetchSavedJobIds } from "@/lib/client-data";
import type { Application, CandidateProfile, Job } from "@/types";

function DashboardOverviewInner() {
  const [applications, setApplications] = React.useState<Application[]>([]);
  const [savedIds, setSavedIds] = React.useState<string[]>([]);
  const [profile, setProfile] = React.useState<CandidateProfile>(INITIAL_PROFILE);
  const [allJobs, setAllJobs] = React.useState<Job[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    Promise.all([fetchApplications(), fetchSavedJobIds(), fetchProfile(), fetchJobs()]).then(
      ([apps, saved, prof, jobs]) => {
        if (!mounted) return;
        setApplications(apps);
        setSavedIds(saved);
        setProfile(prof);
        setAllJobs(jobs);
        setLoaded(true);
      }
    );
    return () => {
      mounted = false;
    };
  }, []);

  const completion = calculateProfileCompletion(profile);
  const interviews = applications.filter((a) => a.status === "Interview" || a.status === "Shortlisted");
  const recommended = allJobs.filter((j) => {
    const text = `${j.title} ${j.skills.join(" ")}`.toLowerCase();
    return profile.skills.some((s) => text.includes(s.toLowerCase()));
  });
  const recList = recommended.length >= 3 ? recommended : allJobs.slice(0, 3);
  const deadlines = allJobs.filter((j) => j.type === "Internship" && j.status === "open").slice(0, 4);

  if (!loaded) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-zinc-100" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-100" />
          ))}
        </div>
        <div className="h-32 animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Overview</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Welcome back, {profile.name.split(" ")[0] || "there"}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Applications" value={applications.length} icon={FileText} />
        <StatsCard title="Interviews" value={interviews.length} icon={Video} />
        <StatsCard title="Saved Jobs" value={savedIds.length} icon={Bookmark} />
        <StatsCard title="Profile Completion" value={`${completion}%`} icon={UserRound} />
      </div>

      {/* Profile completion */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Complete your profile</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {completion}% complete — a complete profile gets up to 3× more views from recruiters.
            </p>
          </div>
          <Link
            href="/dashboard/profile"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
          >
            {completion >= 100 ? "View profile" : "Complete profile"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.6fr_1fr]">
        {/* Recent applications */}
        <section className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 p-6 pb-4">
            <h2 className="text-base font-semibold text-zinc-900">Recent applications</h2>
            <Link
              href="/dashboard/applications"
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900"
            >
              View all
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-zinc-50">
            {applications.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No applications yet"
                  description="Start applying to internships and jobs that match your skills."
                  actionLabel="Find Jobs"
                  actionHref="/jobs"
                />
              </div>
            ) : (
              applications.slice(0, 4).map((a) => (
                <Link
                  key={a.id}
                  href="/dashboard/applications"
                  className="flex items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-zinc-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900">{a.jobTitle}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{a.companyName}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Upcoming deadlines */}
        <section className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
          <div className="border-b border-zinc-100 p-6 pb-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
              <CalendarClock className="h-4 w-4 text-amber-500" />
              Application deadlines
            </h2>
          </div>
          <div className="space-y-3 p-6">
            {deadlines.length === 0 ? (
              <p className="text-sm text-zinc-500">No open internships right now.</p>
            ) : (
              deadlines.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 p-3 transition-colors hover:bg-zinc-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-800">{job.title}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">{job.companyName}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-amber-600">
                    {job.applicationDeadline}
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Recommended */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900">
            <Sparkles className="h-4 w-4 text-blue-600" />
            Recommended for you
          </h2>
          <Link href="/dashboard/recommended" className="text-sm font-medium text-blue-600 hover:underline">
            See all
          </Link>
        </div>
        {profile.skills.length > 0 && (
          <p className="mt-1 text-sm text-zinc-500">
            Based on your skills: {profile.skills.slice(0, 3).join(", ")}
          </p>
        )}
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {recList.slice(0, 3).map((job) => (
            <JobCard key={job.id} job={job} showApply={false} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function DashboardOverview() {
  return <DashboardOverviewInner />;
}