import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  FileText,
  Mail,
  ShieldAlert,
  User,
} from "lucide-react";
import { AdminInterviewActions } from "@/components/admin-interview-actions";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function asRecord(v: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function catScores(v: Prisma.JsonValue | null | undefined): [string, number][] {
  const rec = asRecord(v);
  return Object.entries(rec)
    .filter(([, val]) => typeof val === "number")
    .map(([k, val]) => [k, val as number]);
}

function phoneOf(v: Prisma.JsonValue | null | undefined): string | null {
  const rec = asRecord(v);
  return typeof rec.phone === "string" && rec.phone ? rec.phone : null;
}

export default async function AdminInterviewDetailPage({ params }: Params) {
  const { id } = await params;
  const interview = await prisma.aiInterview.findUnique({
    where: { id },
    include: {
      application: {
        include: {
          job: { include: { company: { select: { name: true, logo: true } } } },
          user: { select: { id: true, name: true, email: true } },
          resume: { select: { id: true, fileName: true, fileUrl: true, structuredData: true } },
        },
      },
      messages: { orderBy: { createdAt: "asc" } },
      answers: { orderBy: { questionIndex: "asc" } },
      integrityEvents: { orderBy: { occurredAt: "asc" } },
    },
  });
  if (!interview) notFound();

  const app = interview.application;
  const report = asRecord(interview.report);
  const scores = catScores(interview.categoryScores);
  const phone = phoneOf(app.resume?.structuredData);

  const transcript: { question: string; answer: string; createdAt: string }[] = [];
  for (let i = 0; i < interview.messages.length; i++) {
    const m = interview.messages[i];
    if (m.role === "ai") {
      const next = interview.messages[i + 1];
      if (next?.role === "candidate") {
        transcript.push({
          question: m.content,
          answer: next.content,
          createdAt: m.createdAt.toISOString(),
        });
      }
    }
  }

  const integrityCounts: Record<string, number> = {};
  for (const e of interview.integrityEvents) {
    integrityCounts[e.eventType] = (integrityCounts[e.eventType] ?? 0) + 1;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/admin/interviews" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800">
        <ArrowLeft className="h-4 w-4" />
        Back to AI Interview Candidates
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-lg font-bold text-white">
            {initials(app.user.name)}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{app.user.name}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {app.user.email}
              {phone ? ` · ${phone}` : ""}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-600">
              Applied for <span className="font-medium text-zinc-900">{app.job.title}</span> ·{" "}
              {app.job.company.name}
            </p>
          </div>
        </div>
        {app.resume && (
          <a
            href={app.resume.fileUrl}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            <FileText className="h-4 w-4" />
            View CV
          </a>
        )}
      </div>

      <AdminInterviewActions
        applicationId={app.id}
        interviewId={interview.id}
        applicationStatus={app.status}
        interviewStatus={interview.status}
        initialNote={typeof report.notes === "string" ? report.notes : ""}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {interview.status === "COMPLETED" && (
            <>
              <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-zinc-900">AI Interview · {recommendationLabel(String(report.recommendation ?? ""))}</h2>
                <div className="mt-4 flex items-end gap-3">
                  <span className={`text-5xl font-bold ${scoreColor(interview.score)}`}>
                    {interview.score ?? "—"}
                  </span>
                  <span className="pb-1 text-sm text-zinc-400">/100</span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-zinc-600">{interview.summary}</p>

                {scores.length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Score breakdown</p>
                    <div className="mt-3 space-y-2.5">
                      {scores.map(([name, score]) => (
                        <ScoreBar key={name} name={name} score={score} />
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Strengths</p>
                    <ul className="mt-2 space-y-1.5 text-sm text-emerald-900">
                      {(interview.strengths?.length ? interview.strengths : []).map((s) => (
                        <li key={s} className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Areas to improve</p>
                    <ul className="mt-2 space-y-1.5 text-sm text-amber-900">
                      {(interview.concerns?.length ? interview.concerns : []).map((s) => (
                        <li key={s} className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
              {interview.recordingDriveFileId && (
                <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-900">Interview video</h2>
                      <p className="mt-1 text-xs text-zinc-500">Private recording loaded from Google Drive.</p>
                    </div>
                    <a
                      href={`/api/admin/interviews/${interview.id}/video`}
                      download
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      Download
                    </a>
                  </div>
                  <video
                    className="mt-4 aspect-video w-full rounded-xl bg-black"
                    controls
                    preload="metadata"
                    src={`/api/admin/interviews/${interview.id}/video`}
                  />
                </section>
              )}

              <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-zinc-900">Interview Transcript</h2>
                  <a
                    href={`/api/admin/interviews/${interview.id}/report`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download report
                  </a>
                </div>
                <div className="mt-4 space-y-4">
                  {transcript.length === 0 && <p className="text-sm text-zinc-400">No transcript available.</p>}
                  {transcript.map((t, i) => (
                    <div key={i} className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4">
                      <p className="text-sm font-medium text-zinc-900">Q{i + 1}. {t.question}</p>
                      <p className="mt-2 rounded-lg bg-white p-3 text-sm leading-relaxed text-zinc-700 ring-1 ring-zinc-100">
                        {t.answer === "(no audible answer)" ? <span className="italic text-zinc-400">{t.answer}</span> : t.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {interview.status !== "COMPLETED" && (
            <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">Interview status</h2>
              <p className="mt-2 text-sm text-zinc-600">
                This candidate&apos;s AI interview is{" "}
                <span className="font-medium">{interview.status === "IN_PROGRESS" ? "in progress" : "pending"}.</span>
                {interview.status === "IN_PROGRESS"
                  ? ` The candidate may resume it — the first question was asked ${interview.startedAt ? new Date(interview.startedAt).toLocaleString() : "recently"}.`
                  : " Share the invite link below so the candidate can begin."}
              </p>
              <a
                href={`/interview/${interview.inviteToken}`}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
              >
                {`${process.env.NEXT_PUBLIC_APP_URL || ""}/interview/${interview.inviteToken}`}
              </a>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <User className="h-4 w-4 text-zinc-400" />
              Candidate information
            </h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <Row k="Name" v={app.user.name} />
              <Row k="Email" v={app.user.email} />
              {phone && <Row k="Phone" v={phone} />}
              <Row k="Applied role" v={app.job.title} />
              <Row k="CV" v={app.resume?.fileName ?? "Not uploaded"} />
            </dl>
            <a
              href={`mailto:${app.user.email}?subject=Your%20application%20to%20${encodeURIComponent(app.job.title)}%20at%20UpJob`}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              <Mail className="h-4 w-4" />
              Contact candidate
            </a>
          </section>

          <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">AI Interview</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <Row k="Interview date" v={interview.startedAt ? new Date(interview.startedAt).toLocaleDateString() : "—"} />
              <Row
                k="Duration"
                v={typeof report.durationMinutes === "number" ? `${Math.round(report.durationMinutes)} min` : interview.status === "COMPLETED" && interview.durationSeconds ? `${Math.round(interview.durationSeconds / 60)} min` : "—"}
              />
              <Row k="Overall score" v={interview.score !== null ? `${interview.score}/100` : "—"} />
              <Row k="Recommendation" v={recommendationLabel(String(interview.recommendation ?? ""))} />
              <Row k="Verdict" v={interview.verdict ?? "—"} />
            </dl>
          </section>

          <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <ShieldAlert className="h-4 w-4 text-zinc-400" />
              Integrity events
            </h2>
            <p className="mt-1 text-xs text-zinc-400">Logged for review. These never auto-reject a candidate.</p>
            {Object.keys(integrityCounts).length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">No integrity events recorded.</p>
            ) : (
              <dl className="mt-3 space-y-2 text-sm">
                {Object.entries(integrityCounts).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-zinc-600">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      {humanize(type)}
                    </span>
                    <span className="font-semibold text-zinc-900">{count}</span>
                  </div>
                ))}
              </dl>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-zinc-500">{k}</dt>
      <dd className="text-right font-medium text-zinc-800">{v}</dd>
    </div>
  );
}

function ScoreBar({ name, score }: { name: string; score: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-600">{name}</span>
        <span className="font-semibold text-zinc-900">{score}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
        <div className={`h-full rounded-full ${score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-blue-500" : score >= 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-zinc-300";
  if (score >= 80) return "text-emerald-600";
  if (score >= 65) return "text-blue-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

function humanize(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function recommendationLabel(r: string): string {
  return r ? r.replace(/_/g, " ") : "—";
}