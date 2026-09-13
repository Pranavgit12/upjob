import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AiInterviewStatus, ApplicationStatus } from "@prisma/client";
import { Timer, Video, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  role?: string;
  status?: string;
  app?: string;
  sort?: string;
  q?: string;
}>;

const SORTS: Record<string, { orderBy: Record<string, "asc" | "desc"> }> = {
  score: { orderBy: { score: "desc" } },
  score_asc: { orderBy: { score: "asc" } },
  newest: { orderBy: { createdAt: "desc" } },
  oldest: { orderBy: { createdAt: "asc" } },
};

export default async function AdminInterviewsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const role = sp.role ?? "all";
  const status = sp.status ?? "all";
  const appStatus = sp.app ?? "all";
  const q = (sp.q ?? "").trim();
  const sort = sp.sort ?? "newest";

  const where = buildWhere(role, status, appStatus, q);

  const interviews = await prisma.aiInterview.findMany({
    where,
    include: {
      application: {
        include: {
          job: { select: { title: true, company: { select: { name: true } } } },
          user: { select: { id: true, name: true, email: true } },
          resume: { select: { fileName: true, fileUrl: true, structuredData: true } },
        },
      },
    },
    orderBy: SORTS[sort]?.orderBy ?? { createdAt: "desc" },
  });

  const counts = {
    all: interviews.length,
    completed: interviews.filter((i) => i.status === "COMPLETED").length,
    inProgress: interviews.filter((i) => i.status === "IN_PROGRESS").length,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">HR Admin</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">AI Interview Candidates</h1>
          <p className="mt-1 text-sm text-zinc-500">
            AI output is decision-support only — review before shortlisting or rejecting.
          </p>
        </div>
        <nav className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1">
          {[
            { href: "/admin", label: "Overview" },
            { href: "/admin/interviews", label: "AI Interviews" },
            { href: "/admin/interviews/settings", label: "Settings" },
          ].map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                (l.href === "/admin/interviews" && true) || (i === 0 && l.href === "/admin")
                  ? "bg-black text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4">
        <Stat label="Total interviews" value={counts.all} />
        <Stat label="Completed" value={counts.completed} />
        <Stat label="In progress" value={counts.inProgress} />
      </div>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
        <Field label="Job role">
          <select name="role" defaultValue={role} className="h-9 w-44 rounded-lg border border-zinc-200 bg-white px-2 text-sm">
            <option value="all">All roles</option>
            <option value="frontend">Frontend</option>
            <option value="bde">BDE</option>
          </select>
        </Field>
        <Field label="AI interview">
          <select name="status" defaultValue={status} className="h-9 w-40 rounded-lg border border-zinc-200 bg-white px-2 text-sm">
            <option value="all">All</option>
            <option value="INVITED">Pending</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </Field>
        <Field label="Application status">
          <select name="app" defaultValue={appStatus} className="h-9 w-44 rounded-lg border border-zinc-200 bg-white px-2 text-sm">
            <option value="all">All</option>
            {Object.values(ApplicationStatus).map((s) => (
              <option key={s} value={s}>{label(s)}</option>
            ))}
          </select>
        </Field>
        <Field label="Sort by">
          <select name="sort" defaultValue={sort} className="h-9 w-44 rounded-lg border border-zinc-200 bg-white px-2 text-sm">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="score">Highest score</option>
            <option value="score_asc">Lowest score</option>
          </select>
        </Field>
        <Field label="Search">
          <input name="q" defaultValue={q} placeholder="Name or email" className="h-9 w-48 rounded-lg border border-zinc-200 bg-white px-2 text-sm" />
        </Field>
        <button type="submit" className="h-9 rounded-lg bg-black px-4 text-sm font-semibold text-white hover:bg-zinc-800">
          Apply
        </button>
        {role !== "all" || status !== "all" || appStatus !== "all" || q || sort !== "newest" ? (
          <Link href="/admin/interviews" className="h-9 rounded-lg px-3 py-2 text-sm text-zinc-500 hover:text-zinc-800">
            Clear
          </Link>
        ) : null}
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Candidate</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 text-right font-semibold">AI Score</th>
                <th className="px-4 py-3 font-semibold">Interview</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {interviews.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-400">
                    No candidates match these filters yet.
                  </td>
                </tr>
              )}
              {interviews.map((iv) => (
                <tr key={iv.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{iv.application.user.name}</p>
                    <p className="text-xs text-zinc-400">{iv.application.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{iv.application.job.title}</td>
                  <td className="px-4 py-3 text-right">
                    {iv.status === "COMPLETED" && iv.score !== null ? (
                      <span className={`font-semibold ${iv.score >= 80 ? "text-emerald-600" : iv.score >= 65 ? "text-blue-600" : iv.score >= 50 ? "text-amber-600" : "text-red-600"}`}>
                        {iv.score}
                      </span>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${iv.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : iv.status === "IN_PROGRESS" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                      {iv.status === "COMPLETED" ? <ShieldCheck className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
                      {iv.status === "COMPLETED" ? "Completed" : iv.status === "IN_PROGRESS" ? "In progress" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                      {label(iv.application.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/interviews/${iv.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700">
                      <Video className="h-3.5 w-3.5" />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function buildWhere(role: string, status: string, appStatus: string, q: string) {
  const where: Record<string, unknown> = {};
  const appIs: Record<string, unknown> = {};
  if (role !== "all") {
    appIs.job =
      role === "bde"
        ? { is: { title: { contains: "Business Development" } } }
        : { is: { title: { contains: "Frontend" } } };
  }
  if (status !== "all" && Object.values(AiInterviewStatus).includes(status as AiInterviewStatus)) {
    where.status = status as AiInterviewStatus;
  }
  if (appStatus !== "all") {
    appIs.status = appStatus as ApplicationStatus;
  }
  if (q) {
    appIs.OR = [
      { user: { is: { name: { contains: q, mode: "insensitive" } } } },
      { user: { is: { email: { contains: q, mode: "insensitive" } } } },
    ];
  }
  if (Object.keys(appIs).length > 0) {
    where.application = { is: appIs };
  }
  return where;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function label(s: string): string {
  return s
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}