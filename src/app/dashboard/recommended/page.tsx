"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { JobCard } from "@/components/job-card";
import { EmptyState } from "@/components/empty-state";
import { fetchJobs, fetchProfile } from "@/lib/client-data";
import { INITIAL_PROFILE } from "@/lib/profile";
import type { CandidateProfile, Job } from "@/types";

export default function RecommendedJobsPage() {
  const [profile, setProfile] = React.useState<CandidateProfile>(INITIAL_PROFILE);
  const [allJobs, setAllJobs] = React.useState<Job[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    Promise.all([fetchProfile(), fetchJobs()]).then(([p, jobs]) => {
      if (!mounted) return;
      setProfile(p);
      setAllJobs(jobs);
      setLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const scored = allJobs
    .filter((j) => j.status === "open")
    .map((job) => {
      const text = `${job.title} ${job.skills.join(" ")} ${job.companyName ?? ""} ${job.category}`.toLowerCase();
      let score = 0;
      profile.skills.forEach((skill) => {
        if (text.includes(skill.toLowerCase())) score += 2;
      });
      const city = profile.location.split(",")[0].toLowerCase();
      if (city && job.location.toLowerCase().includes(city)) score += 1;
      if (profile.experience.length > 0 && job.experience.includes("0")) score += 1;
      return { job, score };
    })
    .sort((a, b) => b.score - a.score || Date.parse(b.job.createdAt) - Date.parse(a.job.createdAt))
    .map(({ job }) => job);

  const recommendations = scored.slice(0, 12);

  if (!loaded) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-zinc-100" />
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
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-zinc-900">
          <Sparkles className="h-5 w-5 text-blue-600" />
          Recommended For You
        </h1>
        {profile.skills.length > 0 ? (
          <p className="mt-1 text-sm text-zinc-500">
            Matched to your skills: {profile.skills.slice(0, 4).join(", ")}
          </p>
        ) : (
          <p className="mt-1 text-sm text-zinc-500">
            Add skills to your profile to get personalized recommendations.
          </p>
        )}
      </div>

      {recommendations.length === 0 ? (
        <EmptyState
          title="No recommendations yet"
          description="Add more skills and preferences to your profile to unlock personalized recommendations."
          actionLabel="Update Profile"
          actionHref="/dashboard/profile"
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {recommendations.map((job) => (
            <JobCard key={job.id} job={job} showApply={false} />
          ))}
        </div>
      )}
    </div>
  );
}