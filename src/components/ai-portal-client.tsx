"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileUp,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export type RoleJobLite = {
  role: {
    key: string;
    title: string;
    stipend: string;
    tagline: string;
    shortDescription: string;
    requiredSkills: string[];
    location: string;
    workMode: string;
    phases: string[];
    durationMinutes: number;
  };
  job: { id: string; title: string; salaryMin: number; company: { name: string; logo: string | null } };
  app: {
    id: string;
    status: string;
    interview: {
      token: string;
      status: string;
      startedAt: string | null;
      completedAt: string | null;
      currentStep: number;
      maxSteps: number;
    } | null;
  } | null;
};

const FLOW_STEPS = [
  "Applied",
  "CV Uploaded",
  "AI Interview Pending",
  "AI Interview In Progress",
  "AI Interview Completed",
  "Under HR Review",
  "Shortlisted / Rejected",
];

const HR_STATUS_MAP: Record<string, number> = {
  APPLIED: 0,
  UNDER_REVIEW: 5,
  SHORTLISTED: 6,
  INTERVIEW: 6,
  SELECTED: 6,
  REJECTED: 6,
};

export function AiPortalClient({
  userName,
  hasPrimaryCv,
  resumeFileName,
  roleJobs,
}: {
  userName: string;
  hasPrimaryCv: boolean;
  resumeFileName: string | null;
  roleJobs: RoleJobLite[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [applying, setApplying] = React.useState<string | null>(null);

  const currentStep = (apps: RoleJobLite["app"][]): number => {
    if (!apps.length) return 0;
    const mostAdvanced = apps.reduce<number>((max, a) => {
      if (!a) return max;
      let s = HR_STATUS_MAP[a.status] ?? 0;
      if (a.interview?.status === "COMPLETED") s = Math.max(s, 4);
      else if (a.interview?.status === "IN_PROGRESS") s = Math.max(s, 3);
      else if (a.interview) s = Math.max(s, 2);
      if (s === 0) s = 1;
      return Math.max(max, s);
    }, 0);
    return mostAdvanced;
  };

  const applyAndStart = async (roleJob: RoleJobLite) => {
    if (!hasPrimaryCv) {
      toast("Upload your CV first", {
        type: "info",
        description: "Our AI interviewer personalizes questions from your CV.",
      });
      router.push("/dashboard/resume?next=/dashboard/ai");
      return;
    }
    setApplying(roleJob.job.id);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: roleJob.job.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not apply");
      toast("Application submitted", {
        type: "success",
        description: "Redirecting to your AI interview…",
      });
      router.push(`/interview/${data.interview.inviteToken}`);
    } catch (err) {
      toast("Application failed", {
        type: "error",
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setApplying(null);
    }
  };

  const flow = FLOW_STEPS.map((label, i) => ({ label, index: i }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Welcome, {userName}{" "}
          <span className="text-3xl">👋</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Intern Today. Get Hired Tomorrow. Pick an internship, then take your{" "}
          <span className="font-medium text-zinc-700">~30-minute AI video interview</span> — no
          recruiter needed to get in front of HR.
        </p>
      </div>

      {!hasPrimaryCv && (
        <Link
          href="/dashboard/resume?next=/dashboard/ai"
          className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <FileUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">Upload your CV to get started</p>
              <p className="text-xs text-amber-700">
                The AI interviewer reads your CV to personalize your interview.
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-amber-600" />
        </Link>
      )}

      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900">
            Application Status:{" "}
            <span className="text-blue-600">{FLOW_STEPS[currentStep(roleJobs.map((r) => r.app))]}</span>
          </p>
          <p className="text-xs text-zinc-400">
            {hasPrimaryCv ? `CV on file: ${resumeFileName ?? "primary"}` : "No CV uploaded yet"}
          </p>
        </div>
        <ol className="mt-4 flex flex-wrap gap-2">
          {flow.map((step) => (
            <li key={step.label} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  step.index <= currentStep(roleJobs.map((r) => r.app))
                    ? "bg-black text-white"
                    : "bg-zinc-100 text-zinc-400"
                }`}
              >
                {step.index + 1}
              </span>
              <span
                className={`text-xs ${step.index <= currentStep(roleJobs.map((r) => r.app)) ? "text-zinc-800" : "text-zinc-400"}`}
              >
                {step.label}
              </span>
              {step.index < FLOW_STEPS.length - 1 && <span className="h-px w-3 bg-zinc-200" />}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {roleJobs.map((roleJob) => (
          <article
            key={roleJob.job.id}
            className="flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-blue-600">Internship</p>
                <h2 className="mt-0.5 text-lg font-bold text-zinc-900">{roleJob.role.title}</h2>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </span>
            </div>

            <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
              <MapPin className="h-3.5 w-3.5" />
              {roleJob.role.location} · {roleJob.role.workMode} ·{" "}
              <Clock className="h-3.5 w-3.5" />
              {roleJob.role.durationMinutes}-min interview
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {roleJob.role.stipend}
              </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              {roleJob.role.shortDescription}
            </p>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Required skills
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {roleJob.role.requiredSkills.map((s) => (
                  <span
                    key={s}
                    className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-1 items-end">
              {roleJob.app ? (
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2 ring-1 ring-zinc-100">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-zinc-800">
                        {roleJob.app.interview ? interviewLabel(roleJob.app.interview.status) : "Applied"}
                      </span>
                    </div>
                    {roleJob.app.interview?.status === "COMPLETED" && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                  </div>
                  {roleJob.app.interview && roleJob.app.interview.status !== "COMPLETED" && (
                    <Button
                      className="w-full"
                      onClick={() => router.push(`/interview/${roleJob.app?.interview?.token}`)}
                    >
                      {roleJob.app.interview.status === "IN_PROGRESS" ? "Resume Interview" : "Start Interview"}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                  {roleJob.app.interview?.status === "COMPLETED" && (
                    <p className="text-center text-xs text-zinc-500">
                      Interview submitted. Shortlisting / rejection is decided by our admin team
                      only — you&apos;ll hear the verdict within 24–48 hours.
                    </p>
                  )}
                </div>
              ) : (
                <Button className="w-full" onClick={() => applyAndStart(roleJob)} disabled={applying === roleJob.job.id}>
                  {applying === roleJob.job.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Applying…
                    </>
                  ) : (
                    <>
                      Apply & Start Interview
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
        <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
        <p className="text-xs leading-relaxed text-zinc-500">
          Not sure how this works? Sign in → upload your CV → choose an internship → complete a
          quick system check → take your ~30-minute AI video interview. The AI interviewer asks
          one question at a time (your camera and mic stay on), and HR reviews the report
          afterwards. Your score is never shown to you here.
        </p>
      </div>
    </div>
  );
}

function interviewLabel(status: string): string {
  switch (status) {
    case "INVITED":
      return "AI Interview Pending";
    case "IN_PROGRESS":
      return "AI Interview In Progress";
    case "COMPLETED":
      return "AI Interview Completed";
    default:
      return "AI Interview";
  }
}