"use client";

import * as React from "react";
import { useToast } from "@/components/ui/toast";
import {
  Check,
  Copy,
  ExternalLink,
  FileText,
  Download,
  Search,
  NotebookPen,
  Loader2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";
import type { EmployerApplication } from "@/app/employer/applications/page";

type StatusValue = "APPLIED" | "UNDER_REVIEW" | "SHORTLISTED" | "INTERVIEW" | "SELECTED" | "REJECTED";

const STATUS_ORDER: StatusValue[] = ["APPLIED", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEW", "SELECTED", "REJECTED"];

const STATUS_STYLE: Record<StatusValue, { label: string; cls: string }> = {
  APPLIED: { label: "Applied", cls: "bg-zinc-100 text-zinc-700" },
  UNDER_REVIEW: { label: "Under review", cls: "bg-blue-50 text-blue-700" },
  SHORTLISTED: { label: "Shortlisted", cls: "bg-emerald-50 text-emerald-700" },
  INTERVIEW: { label: "Next round", cls: "bg-violet-50 text-violet-700" },
  SELECTED: { label: "Selected", cls: "bg-emerald-600 text-white" },
  REJECTED: { label: "Rejected", cls: "bg-red-50 text-red-700" },
};

const INTERVIEW_FILTERS = [
  { value: "ALL", label: "Any interview status" },
  { value: "INVITED", label: "Invited" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "NONE", label: "Not invited" },
] as const;

const SORTS = [
  { value: "newest", label: "Newest applied" },
  { value: "overall", label: "Highest overall score" },
  { value: "ai", label: "Highest AI score" },
  { value: "cv", label: "Highest CV score" },
] as const;

function scoreColor(score: number | null): string {
  if (score === null) return "text-zinc-300";
  if (score >= 80) return "text-emerald-600";
  if (score >= 65) return "text-blue-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

function barColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-blue-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function humanize(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function EmployerApplications({ applications }: { applications: EmployerApplication[] }) {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [interviewFilter, setInterviewFilter] = React.useState<string>("ALL");
  const [sort, setSort] = React.useState<string>("newest");

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = applications.filter((a) => {
      if (q && !(a.candidateName.toLowerCase().includes(q) || a.candidateEmail.toLowerCase().includes(q) || a.jobTitle.toLowerCase().includes(q))) {
        return false;
      }
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (interviewFilter === "NONE" && a.interview) return false;
      if (interviewFilter !== "ALL" && interviewFilter !== "NONE" && a.interview?.status !== interviewFilter) return false;
      return true;
    });
    const score = (a: EmployerApplication): number => a.interview?.overall ?? a.cvScore ?? 0;
    switch (sort) {
      case "overall":
        list = [...list].sort((a, b) => score(b) - score(a));
        break;
      case "ai":
        list = [...list].sort((a, b) => (b.interview?.score ?? -1) - (a.interview?.score ?? -1));
        break;
      case "cv":
        list = [...list].sort((a, b) => b.cvScore - a.cvScore);
        break;
      default:
        list = [...list].sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
    }
    return list;
  }, [applications, search, statusFilter, interviewFilter, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or job…"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none"
          aria-label="Filter by application status"
        >
          <option value="ALL">Any status</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{STATUS_STYLE[s].label}</option>
          ))}
        </select>
        <select
          value={interviewFilter}
          onChange={(e) => setInterviewFilter(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none"
          aria-label="Filter by interview status"
        >
          {INTERVIEW_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none"
          aria-label="Sort applications"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-5 py-3 font-semibold">Candidate</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Applied</th>
                <th className="px-4 py-3 text-center font-semibold">CV</th>
                <th className="px-4 py-3 text-center font-semibold">AI</th>
                <th className="px-4 py-3 text-center font-semibold">Overall</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-zinc-400">
                    No applications match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((app) => <Row key={app.id} app={app} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-center text-xs text-zinc-400">
        Showing {filtered.length} of {applications.length} applications
      </p>
    </div>
  );
}

function Row({ app }: { app: EmployerApplication }) {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <>
      <tr
        className="cursor-pointer border-b border-zinc-50 transition-colors hover:bg-zinc-50/60"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
              {initials(app.candidateName)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-zinc-900">{app.candidateName}</p>
              <p className="truncate text-xs text-zinc-500">{app.candidateEmail}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3.5">
          <p className="text-zinc-800">{app.jobTitle}</p>
          <p className="text-xs text-zinc-400">{app.companyName}</p>
        </td>
        <td className="px-4 py-3.5 text-xs text-zinc-500">{formatDate(app.appliedAt)}</td>
        <td className="px-4 py-3.5 text-center">
          <Score score={app.cvScore} />
        </td>
        <td className="px-4 py-3.5 text-center">
          <Score score={app.interview?.score ?? null} />
        </td>
        <td className="px-4 py-3.5 text-center">
          <Score score={app.interview?.overall ?? null} bold />
        </td>
        <td className="px-4 py-3.5">
          <StatusBadge status={app.status as StatusValue} />
          <InterviewChip status={app.interview?.status ?? null} />
        </td>
        <td className="px-4 py-3.5 text-right">
          <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? "Hide" : "Review"}
          </span>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="bg-zinc-50/60 px-5 py-5">
            <DetailPanel app={app} />
          </td>
        </tr>
      )}
    </>
  );
}

function Score({ score, bold }: { score: number | null; bold?: boolean }) {
  if (score === null) return <span className="text-zinc-300">—</span>;
  return <span className={`font-semibold tabular-nums ${bold ? "text-base " : ""}${scoreColor(score)}`}>{score}</span>;
}

function StatusBadge({ status }: { status: StatusValue }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.APPLIED;
  return (
    <span className={`mr-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

function InterviewChip({ status }: { status: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    INVITED: { label: "Invited", cls: "bg-amber-50 text-amber-700" },
    IN_PROGRESS: { label: "In progress", cls: "bg-blue-50 text-blue-700" },
    COMPLETED: { label: "AI done", cls: "bg-emerald-50 text-emerald-700" },
    EXPIRED: { label: "Expired", cls: "bg-zinc-100 text-zinc-500" },
  };
  const c = map[status ?? ""] ?? { label: "No interview", cls: "bg-zinc-100 text-zinc-400" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${c.cls}`}>
      {c.label}
    </span>
  );
}

function DetailPanel({ app }: { app: EmployerApplication }) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [notes, setNotes] = React.useState(app.recruiterNotes ?? "");
  const token = app.interview?.token ?? null;
  const interview = app.interview;

  const setStatus = async (status: StatusValue) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update status");
      toast(`Marked as ${STATUS_STYLE[status].label}`, { type: "success" });
    } catch (err) {
      toast("Update failed", { type: "error", description: err instanceof Error ? err.message : "Try again." });
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save notes");
      toast("Notes saved", { type: "success" });
    } catch (err) {
      toast("Save failed", { type: "error", description: err instanceof Error ? err.message : "Try again." });
    } finally {
      setSaving(false);
    }
  };

  const copyInvite = async () => {
    if (!token) return;
    const link = `${window.location.origin}/interview/${token}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast("Invite link copied", { type: "success" });
  };

  const scores = Object.entries(interview?.categoryScores ?? {}).filter(
    (kv): kv is [string, number] => typeof kv[1] === "number"
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-3 border-b border-zinc-100 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Application decision</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_ORDER.map((s) => {
              const selected = app.status === s;
              return (
                <button
                  key={s}
                  disabled={saving}
                  onClick={() => void setStatus(s)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-60 ${
                    selected
                      ? `ring-1 ring-zinc-300 shadow-sm ${STATUS_STYLE[s].cls}`
                      : "bg-white text-zinc-500 ring-1 ring-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  {STATUS_STYLE[s].label}
                </button>
              );
            })}
          </div>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />}
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-zinc-500">
            <FileText className="h-3.5 w-3.5" />
            Phone: <span className="font-medium text-zinc-800">{app.candidatePhone ?? "—"}</span>
            <span className="mx-1 text-zinc-300">·</span>
            Applied {formatDate(app.appliedAt)}
            <span className="mx-1 text-zinc-300">·</span>
            <span className="font-medium text-zinc-700">{app.jobTitle}</span> at {app.companyName}
          </div>

          {(app.resumeUrl || token) && (
            <div className="flex flex-wrap items-center gap-2">
              {app.resumeUrl && (
                <a
                  href={app.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Open CV {app.resumeFileName ? `· ${app.resumeFileName}` : ""}
                </a>
              )}
              {token && (
                <>
                  <button
                    onClick={() => void copyInvite()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy interview link"}
                  </button>
                  <a
                    href={`/interview/${token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open interview
                  </a>
                </>
              )}
              {interview && (
                <a
                  href={`/api/admin/interviews/${interview.id}/report`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download report
                </a>
              )}
            </div>
          )}
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            <NotebookPen className="h-3.5 w-3.5" />
            Recruiter notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Private notes for this candidate (only you can see these)…"
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
          />
          <button
            onClick={() => void saveNotes()}
            disabled={saving || notes === (app.recruiterNotes ?? "")}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Save notes
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {interview?.status === "COMPLETED" ? (
          <>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">AI Interview result</p>
                  <div className="mt-1 flex items-end gap-2">
                    <span className={`text-4xl font-bold ${scoreColor(interview.score)}`}>{interview.score ?? "—"}</span>
                    <span className="pb-1 text-xs text-zinc-400">/100</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Overall</p>
                  <p className={`mt-1 text-2xl font-bold ${scoreColor(interview.overall)}`}>{interview.overall ?? "—"}</p>
                </div>
              </div>
              {interview.recommendation && (
                <p className="mt-2 text-sm font-medium text-zinc-700">{humanize(interview.recommendation)}</p>
              )}
              {interview.summary && (
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{interview.summary}</p>
              )}
            </div>

            {scores.length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Score breakdown</p>
                <div className="mt-3 space-y-2.5">
                  {scores.map(([name, score]) => (
                    <div key={name}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-600">{humanize(name)}</span>
                        <span className="font-semibold text-zinc-900">{score}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                        <div className={`h-full rounded-full ${barColor(score)}`} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                {interview.strengths.length > 0 && (
                  <div className="mt-4 rounded-xl bg-emerald-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Strengths</p>
                    <ul className="mt-1.5 space-y-1 text-sm text-emerald-900">
                      {interview.strengths.map((s) => (
                        <li key={s} className="flex gap-2">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {interview.concerns.length > 0 && (
                  <div className="mt-3 rounded-xl bg-amber-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Areas to improve</p>
                    <ul className="mt-1.5 space-y-1 text-sm text-amber-900">
                      {interview.concerns.map((s) => (
                        <li key={s} className="flex gap-2">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {interview.transcript.length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Transcript</p>
                <div className="mt-3 max-h-80 space-y-3 overflow-y-auto pr-1">
                  {interview.transcript
                    .filter((m) => m.role === "ai" || m.role === "candidate")
                    .map((m) => (
                      <div key={m.id}>
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400">
                          {m.role === "candidate" ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                          )}
                          {m.role === "candidate" ? "Candidate" : "AI interviewer"}
                          <span className="font-normal text-zinc-300">{formatTime(m.createdAt)}</span>
                        </p>
                        <p className="mt-0.5 rounded-lg bg-zinc-50 px-3 py-2 text-sm leading-relaxed text-zinc-700">
                          {m.content}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
            {interview?.status === "IN_PROGRESS"
              ? `Interview in progress — question ${interview.currentStep} of ${interview.maxSteps}.`
              : interview?.status === "INVITED"
                ? "Interview invite sent. It will appear here once the candidate completes their AI interview."
                : "No AI interview started for this candidate yet."}
          </div>
        )}
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}