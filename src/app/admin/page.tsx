"use client";

import * as React from "react";
import {
  Users,
  Building2,
  Briefcase,
  FileText,
  Sparkles,
  ShieldCheck,
  LayoutGrid,
  AlertTriangle,
  Settings,
  Search,
  CheckCircle2,
  UserPlus,
  Plus,
  Copy,
  Check,
  Trash2,
  Lock,
  Unlock,
  Loader2,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { CompanyLogo } from "@/components/company-logo";
import { cn } from "@/lib/utils";
import type { Company } from "@/types";

const TABS = [
  { key: "companies", label: "Companies", icon: Building2 },
  { key: "users", label: "Users", icon: Users },
  { key: "candidates", label: "Candidates", icon: UserPlus },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "applications", label: "Applications", icon: FileText },
  { key: "featured", label: "Featured", icon: Sparkles },
  { key: "verification", label: "Verification", icon: ShieldCheck },
  { key: "reports", label: "Reports", icon: AlertTriangle },
  { key: "settings", label: "Settings", icon: Settings },
] as const;

interface Stats {
  companies: number;
  users: number;
  jobs: number;
  applications: number;
  reports: number;
  openReports: number;
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  joined: string;
}

interface Report {
  id: string;
  type: string;
  targetId: string;
  reason: string;
  status: string;
  date: string;
}

interface AdminCandidate {
  id: string;
  candidate: { id: string; name: string; email: string; phone: string | null; joinedAt: string };
  job: { id: string; title: string; companyName: string };
  appliedAt: string;
  status: string;
  cvScore: number;
  resumeFileName: string | null;
  interview: {
    token: string;
    status: string;
    score: number | null;
    overall: number | null;
    recommendation: string | null;
    currentStep: number;
    maxSteps: number;
    completedAt: string | null;
  } | null;
}

function MultiToggle({ onChange, initial = true }: { onChange?: (on: boolean) => void; initial?: boolean }) {
  const [on, setOn] = React.useState(initial);
  return (
    <button
      onClick={() => {
        setOn(!on);
        onChange?.(!on);
      }}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        on ? "bg-black" : "bg-zinc-200"
      )}
      role="switch"
      aria-checked={on}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

async function getJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default function AdminPage() {
  const { toast } = useToast();
  const [tab, setTab] = React.useState<(typeof TABS)[number]["key"]>("companies");
  const [query, setQuery] = React.useState("");
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [jobs, setJobs] = React.useState<Record<string, unknown>[]>([]);
  const [reports, setReports] = React.useState<Report[]>([]);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [candidates, setCandidates] = React.useState<AdminCandidate[]>([]);
  const [addOpen, setAddOpen] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [addMode, setAddMode] = React.useState<"applicant" | "job">("applicant");
  const [addForm, setAddForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "CANDIDATE",
    jobId: "",
  });
  const [jobForm, setJobForm] = React.useState({
    companyId: "",
    title: "",
    type: "Internship",
    workMode: "Remote",
    location: "Remote",
    salaryMin: "",
    salaryMax: "",
    category: "Internship",
    experience: "0 - 1 year",
    skills: "",
    description: "",
  });
  const [invite, setInvite] = React.useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = React.useState(false);

  const loadCandidates = React.useCallback(async () => {
    const data = await getJSON<{ applications: AdminCandidate[] }>("/api/admin/applications");
    if (data) setCandidates(data.applications);
  }, []);

  React.useEffect(() => {
    let mounted = true;
    Promise.all([
      getJSON<{ companies: Company[] }>("/api/companies"),
      getJSON<{ users: AdminUser[] }>("/api/admin/users"),
      getJSON<{ jobs: Record<string, unknown>[] }>("/api/jobs?all=1"),
      getJSON<{ reports: Report[] }>("/api/admin/reports"),
      getJSON<{ stats: Stats }>("/api/admin/stats"),
      getJSON<{ applications: AdminCandidate[] }>("/api/admin/applications"),
    ]).then(([c, u, j, r, s, a]) => {
      if (!mounted) return;
      if (c) setCompanies(c.companies);
      if (u) setUsers(u.users);
      if (j) setJobs(j.jobs);
      if (r) setReports(r.reports);
      if (s) setStats(s.stats);
      if (a) setCandidates(a.applications);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const openAddModal = () => {
    setAddForm({
      name: "",
      email: "",
      phone: "",
      password: "",
      role: "CANDIDATE",
      jobId: String((jobs.find((j) => String(j.status) === "OPEN") as Record<string, unknown> | undefined)?.id ?? ""),
    });
    setInvite(null);
    setAddMode("applicant");
    setAddOpen(true);
  };

  const openAddJobModal = () => {
    setJobForm({
      companyId: String(companies[0]?.id ?? ""),
      title: "",
      type: "Internship",
      workMode: "Remote",
      location: "Remote",
      salaryMin: "",
      salaryMax: "",
      category: "Internship",
      experience: "0 - 1 year",
      skills: "",
      description: "",
    });
    setInvite(null);
    setAddMode("job");
    setAddOpen(true);
  };

  const reloadJobs = React.useCallback(async () => {
    const data = await getJSON<{ jobs: Record<string, unknown>[] }>("/api/jobs?all=1");
    if (data) setJobs(data.jobs);
  }, []);

  const postJob = async () => {
    if (!jobForm.title.trim() || !jobForm.description.trim() || !jobForm.salaryMin || !jobForm.companyId) {
      toast("Check the form", { type: "error", description: "Title, description, salary and company are required." });
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: jobForm.title,
          description: jobForm.description,
          companyId: jobForm.companyId,
          type: jobForm.type,
          workMode: jobForm.workMode,
          location: jobForm.location,
          salaryMin: Number(jobForm.salaryMin),
          salaryMax: jobForm.salaryMax ? Number(jobForm.salaryMax) : null,
          category: jobForm.category,
          experience: jobForm.experience,
          skills: jobForm.skills.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not post job");
      setAddOpen(false);
      toast("Job posted", { type: "success", description: `${jobForm.title} is now live.` });
      await reloadJobs();
    } catch (err) {
      toast("Post failed", { type: "error", description: err instanceof Error ? err.message : "Try again." });
    } finally {
      setAdding(false);
    }
  };

  const addApplicant = async () => {
    if (!addForm.name.trim() || !addForm.email.trim() || addForm.password.length < 6) {
      toast("Check the form", { type: "error", description: "Name, email and a 6+ character password are required." });
      return;
    }
    if (!addForm.jobId) {
      toast("Pick a job", { type: "error", description: "Select a job for this applicant." });
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add applicant");
      setInvite(`${window.location.origin}${data.inviteUrl}`);
      toast("Applicant added", { type: "success", description: "User, application and AI interview invite created." });
      await loadCandidates();
    } catch (err) {
      toast("Add failed", { type: "error", description: err instanceof Error ? err.message : "Try again." });
    } finally {
      setAdding(false);
    }
  };

  const toggleJobStatus = async (job: Record<string, unknown>, status: "open" | "closed") => {
    try {
      const res = await fetch(`/api/jobs/${String(job.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Update failed");
      setJobs((cur) => cur.map((jb) => (String(jb.id) === String(job.id) ? { ...jb, status: status.toUpperCase() } : jb)));
      toast(status === "closed" ? "Job closed" : "Job reopened", { type: "success" });
    } catch {
      toast("Update failed", { type: "error" });
    }
  };

  const deleteJob = async (job: Record<string, unknown>) => {
    const confirmed = window.confirm(`Delete job "${String(job.title)}" and its applications? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/jobs/${String(job.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setJobs((cur) => cur.filter((jb) => String(jb.id) !== String(job.id)));
      toast("Job deleted", { type: "success" });
    } catch {
      toast("Delete failed", { type: "error" });
    }
  };

  const toggleCompany = async (company: Company, field: "isPartner" | "isVerified" | "isFeatured", value: boolean) => {
    const prev = companies;
    setCompanies((cur) => cur.map((c) => (c.id === company.id ? { ...c, [field]: value } : c)));
    try {
      const res = await fetch(`/api/admin/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        setCompanies(prev);
        toast("Update failed", { type: "error" });
        return;
      }
      toast(
        `${field === "isPartner" ? "Partnership" : field === "isVerified" ? "Verification" : "Featured"} updated`,
        { type: "success", description: `${company.name} — ${value ? "enabled" : "disabled"}.` }
      );
    } catch {
      setCompanies(prev);
      toast("Update failed", { type: "error" });
    }
  };

  const resolveReport = async (id: string) => {
    const res = await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "resolved" }),
    });
    if (!res.ok) {
      toast("Could not resolve report", { type: "error" });
      return;
    }
    setReports((cur) => cur.map((r) => (r.id === id ? { ...r, status: "resolved" } : r)));
    toast("Report resolved", { type: "success", description: "Content reviewed and actioned." });
  };

  const filteredCompanies = companies.filter((c) =>
    `${c.name} ${c.industry} ${c.location}`.toLowerCase().includes(query.toLowerCase())
  );
  const filteredJobs = jobs.filter((j) =>
    `${String(j.title ?? "")} ${String(j.category ?? "")} ${String(j.location ?? "")}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Admin Panel</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage users, companies, jobs, verification and platform settings.
          </p>
        </div>
        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 ring-1 ring-red-100">
          Admin access · restricted
        </span>
      </div>

      <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 sm:flex-row">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                tab === t.key ? "bg-white text-zinc-900" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200/70"
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* COMPANY MANAGEMENT */}
        {(tab === "companies" || tab === "featured" || tab === "verification") && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-zinc-900">
                {tab === "featured" ? "Featured Companies" : tab === "verification" ? "Verified Companies" : "Manage Companies"}
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  className="w-64 pl-9"
                  placeholder="Search companies..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-100 bg-zinc-50/50 text-xs uppercase tracking-wide text-zinc-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Company</th>
                    <th className="hidden px-5 py-3 font-semibold md:table-cell">Industry</th>
                    <th className="px-5 py-3 font-semibold">Verified</th>
                    <th className="px-5 py-3 font-semibold">Featured</th>
                    <th className="px-5 py-3 font-semibold">Partner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {filteredCompanies.slice(0, 15).map((company) => (
                    <tr key={company.id} className="transition-colors hover:bg-zinc-50/50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <CompanyLogo name={company.name} size="sm" />
                          <div>
                            <p className="font-medium text-zinc-900">{company.name}</p>
                            <p className="text-xs text-zinc-400">{company.location}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-5 py-3.5 text-zinc-500 md:table-cell">{company.industry}</td>
                      <td className="px-5 py-3.5">
                        <MultiToggle
                          initial={company.isVerified}
                          onChange={(v) => toggleCompany(company, "isVerified", v)}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <MultiToggle
                          initial={company.isFeatured}
                          onChange={(v) => toggleCompany(company, "isFeatured", v)}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <MultiToggle
                          initial={company.isPartner}
                          onChange={(v) => toggleCompany(company, "isPartner", v)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-400">
              {companies.length} companies · Only admins can mark a company as a verified partner —
              employers cannot self-declare.
            </p>
          </div>
        )}

        {/* USERS */}
        {tab === "users" && (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50/50 text-xs uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="hidden px-5 py-3 font-semibold md:table-cell">Role</th>
                  <th className="hidden px-5 py-3 font-semibold lg:table-cell">Joined</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-zinc-50/50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                          {(u.name ?? u.email).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900">{u.name ?? "Unnamed user"}</p>
                          <p className="text-xs text-zinc-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-5 py-3.5 text-zinc-500 md:table-cell">{u.role}</td>
                    <td className="hidden px-5 py-3.5 text-zinc-500 lg:table-cell">{u.joined}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
                          u.status === "active"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-amber-50 text-amber-700 ring-amber-200"
                        )}
                      >
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CANDIDATES (CRM) */}
        {tab === "candidates" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-zinc-900">Candidates</h2>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500">
                  {candidates.length}
                </span>
              </div>
              <Button onClick={openAddModal}>
                <Plus className="h-4 w-4" />
                Add applicant
              </Button>
            </div>

            <div className="overflow-x-auto overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="border-b border-zinc-100 bg-zinc-50/50 text-xs uppercase tracking-wide text-zinc-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Candidate</th>
                    <th className="px-4 py-3 font-semibold">Job</th>
                    <th className="px-4 py-3 font-semibold">Applied</th>
                    <th className="px-4 py-3 text-center font-semibold">CV</th>
                    <th className="px-4 py-3 text-center font-semibold">AI</th>
                    <th className="px-4 py-3 text-center font-semibold">Overall</th>
                    <th className="px-4 py-3 font-semibold">Application</th>
                    <th className="px-4 py-3 font-semibold">Interview</th>
                    <th className="px-4 py-3 text-right font-semibold">Invite</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {candidates.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-10 text-center text-sm text-zinc-400">
                        No candidate applications yet.
                      </td>
                    </tr>
                  ) : (
                    candidates.map((c) => (
                      <tr key={c.id} className="transition-colors hover:bg-zinc-50/50">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                              {c.candidate.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-zinc-900">{c.candidate.name}</p>
                              <p className="max-w-[220px] truncate text-xs text-zinc-400">
                                {c.candidate.email}
                                {c.candidate.phone ? ` · ${c.candidate.phone}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-zinc-800">{c.job.title}</p>
                          <p className="text-xs text-zinc-400">{c.job.companyName}</p>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-zinc-500">
                          {new Date(c.appliedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </td>
                        <td className="px-4 py-3.5 text-center font-semibold tabular-nums text-zinc-700">
                          {c.cvScore}
                        </td>
                        <td className="px-4 py-3.5 text-center font-semibold tabular-nums text-zinc-700">
                          {c.interview?.score ?? "—"}
                        </td>
                        <td className="px-4 py-3.5 text-center font-semibold tabular-nums">
                          <span className={cn(overallClass(c.interview?.overall ?? null))}>
                            {c.interview?.overall ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
                            {humanize(c.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
                              interviewClass(c.interview?.status ?? null)
                            )}
                          >
                            {humanize(c.interview?.status ?? "none")}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {c.interview?.token ? (
                            <CopyInvite token={c.interview.token} />
                          ) : (
                            <span className="text-xs text-zinc-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-400">
              The overall score blends the CV screening score with the AI interview score. Manage full candidate details and
              decisions from the recruiter dashboard.
            </p>
          </div>
        )}

        {/* JOBS */}
        {tab === "jobs" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  className="w-72 pl-9"
                  placeholder="Search jobs..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Button onClick={openAddJobModal}>
                <Plus className="h-4 w-4" />
                Post job
              </Button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-100 bg-zinc-50/50 text-xs uppercase tracking-wide text-zinc-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Job</th>
                    <th className="hidden px-5 py-3 font-semibold md:table-cell">Category</th>
                    <th className="hidden px-5 py-3 font-semibold lg:table-cell">Status</th>
                    <th className="px-5 py-3 font-semibold">Company</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {filteredJobs.slice(0, 20).map((j) => (
                    <tr key={String(j.id)} className="transition-colors hover:bg-zinc-50/50">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-zinc-900">{String(j.title)}</p>
                        <p className="text-xs text-zinc-400">{String(j.location)}</p>
                      </td>
                      <td className="hidden px-5 py-3.5 text-zinc-500 md:table-cell">{String(j.category)}</td>
                      <td className="hidden px-5 py-3.5 lg:table-cell">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
                            String(j.status).toUpperCase() === "OPEN"
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : "bg-zinc-100 text-zinc-500 ring-zinc-200"
                          )}
                        >
                          {String(j.status).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500">{j.companyName ? String(j.companyName) : "—"}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          {String(j.status).toUpperCase() === "OPEN" ? (
                            <button
                              onClick={() => void toggleJobStatus(j, "closed")}
                              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                              title="Close this job listing"
                            >
                              <Lock className="h-3.5 w-3.5" /> Close
                            </button>
                          ) : (
                            <button
                              onClick={() => void toggleJobStatus(j, "open")}
                              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                              title="Reopen this job listing"
                            >
                              <Unlock className="h-3.5 w-3.5" /> Reopen
                            </button>
                          )}
                          <button
                            onClick={() => void deleteJob(j)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                            title="Delete this job and its applications"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button size="sm" variant="outline" onClick={openAddJobModal}>
              <Plus className="h-4 w-4" />
              Post a new job
            </Button>
          </div>
        )}

        {tab === "applications" && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-zinc-900">Application overview</h2>
            <p className="mt-2 text-sm text-zinc-500">
              All applications flowing through the platform are visible here with full audit trails.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["Total applications", stats?.applications ?? "—"],
                ["Total companies", stats?.companies ?? "—"],
                ["Total users", stats?.users ?? "—"],
                ["Open reports", stats?.openReports ?? "—"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
                  <p className="text-2xl font-bold text-zinc-900">{value}</p>
                  <p className="mt-1 text-xs text-zinc-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REPORTS */}
        {tab === "reports" && (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Reported content
              </h2>
            </div>
            {reports.length === 0 ? (
              <p className="p-6 text-sm text-zinc-500">No reports yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-100 bg-zinc-50/50 text-xs uppercase tracking-wide text-zinc-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">Target</th>
                    <th className="hidden px-5 py-3 font-semibold md:table-cell">Reason</th>
                    <th className="hidden px-5 py-3 font-semibold lg:table-cell">Date</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {reports.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-zinc-50/50">
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                          {r.type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-zinc-900">{r.targetId}</td>
                      <td className="hidden px-5 py-3.5 text-zinc-500 md:table-cell">{r.reason}</td>
                      <td className="hidden px-5 py-3.5 text-zinc-500 lg:table-cell">{r.date}</td>
                      <td className="px-5 py-3.5">
                        <span className="uppercase text-xs font-medium text-zinc-400">{r.status}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {r.status !== "resolved" ? (
                          <Button size="sm" onClick={() => resolveReport(r.id)}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Resolve
                          </Button>
                        ) : (
                          <span className="text-xs font-medium text-emerald-600">Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* SETTINGS */}
        {tab === "settings" && (
          <div className="max-w-xl space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-zinc-900">Platform settings</h2>
              <div className="mt-4 space-y-4">
                {[
                  { label: "Automatic job moderation", desc: "AI review new postings for compliance", on: true },
                  { label: "Require employer verification before posting", desc: "Unverified employers can't publish", on: true },
                ].map((s) => (
                  <label key={s.label} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-800">{s.label}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">{s.desc}</p>
                    </div>
                    <MultiToggle initial={s.on} />
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={() => toast("Settings saved", { type: "success" })}>Save Settings</Button>
          </div>
        )}
      </div>

      {/* Add applicant / post job modal */}
      {addOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
              <h2 className="text-base font-semibold text-zinc-900">{addMode === "job" ? "Post a job" : "Add applicant"}</h2>
              <button onClick={() => setAddOpen(false)} aria-label="Close" className="text-zinc-400 hover:text-zinc-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {invite ? (
              <div className="px-6 py-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">Applicant added</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  The account, application and AI interview invite are ready. Share the link below to
                  start the interview.
                </p>
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2.5 text-left">
                  <span className="flex-1 truncate text-xs text-zinc-600">{invite}</span>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(invite);
                      } catch {
                        const ta = document.createElement("textarea");
                        ta.value = invite;
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand("copy");
                        document.body.removeChild(ta);
                      }
                      setInviteCopied(true);
                      setTimeout(() => setInviteCopied(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    {inviteCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {inviteCopied ? "Copied" : "Copy"}
                  </button>
                </div>
                <a
                  href={invite}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
                >
                  Open interview
                </a>
              </div>
            ) : addMode === "job" ? (
              <div className="grid grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 flex items-center gap-0.5 text-sm font-medium text-zinc-700">
                    Job title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    placeholder="e.g. Frontend Developer Intern"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 flex items-center gap-0.5 text-sm font-medium text-zinc-700">
                    Company <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={jobForm.companyId}
                    onChange={(e) => setJobForm({ ...jobForm, companyId: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 text-sm font-medium text-zinc-700">Type</label>
                  <select
                    value={jobForm.type}
                    onChange={(e) => setJobForm({ ...jobForm, type: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  >
                    {["Internship", "Full-time", "Part-time", "Contract"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 text-sm font-medium text-zinc-700">Work mode</label>
                  <select
                    value={jobForm.workMode}
                    onChange={(e) => setJobForm({ ...jobForm, workMode: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  >
                    {["Remote", "Hybrid", "On-site"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 text-sm font-medium text-zinc-700">Location</label>
                  <Input
                    value={jobForm.location}
                    onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                    placeholder="e.g. Remote or Bengaluru"
                  />
                </div>
                <div>
                  <label className="mb-1.5 text-sm font-medium text-zinc-700">Category</label>
                  <Input
                    value={jobForm.category}
                    onChange={(e) => setJobForm({ ...jobForm, category: e.target.value })}
                    placeholder="e.g. Internship"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-0.5 text-sm font-medium text-zinc-700">
                    Min salary ₹ <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={jobForm.salaryMin}
                    onChange={(e) => setJobForm({ ...jobForm, salaryMin: e.target.value })}
                    placeholder="e.g. 10000"
                  />
                </div>
                <div>
                  <label className="mb-1.5 text-sm font-medium text-zinc-700">Max salary ₹</label>
                  <Input
                    type="number"
                    value={jobForm.salaryMax}
                    onChange={(e) => setJobForm({ ...jobForm, salaryMax: e.target.value })}
                    placeholder="optional"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 text-sm font-medium text-zinc-700">Experience</label>
                  <Input
                    value={jobForm.experience}
                    onChange={(e) => setJobForm({ ...jobForm, experience: e.target.value })}
                    placeholder="e.g. Fresher"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 text-sm font-medium text-zinc-700">Skills (comma separated)</label>
                  <Input
                    value={jobForm.skills}
                    onChange={(e) => setJobForm({ ...jobForm, skills: e.target.value })}
                    placeholder="React, TypeScript, Git"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 flex items-center gap-0.5 text-sm font-medium text-zinc-700">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={jobForm.description}
                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    rows={4}
                    placeholder="Role overview, responsibilities and what the candidate will learn…"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 sm:col-span-2">
                  <Button variant="outline" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => void postJob()} disabled={adding}>
                    {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Publish job
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 flex items-center gap-0.5 text-sm font-medium text-zinc-700">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="e.g. Priya Sharma"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-0.5 text-sm font-medium text-zinc-700">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="candidate@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1.5 text-sm font-medium text-zinc-700">Phone</label>
                  <Input
                    type="tel"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-0.5 text-sm font-medium text-zinc-700">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="password"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    placeholder="Min 6 characters"
                  />
                </div>
                <div>
                  <label className="mb-1.5 text-sm font-medium text-zinc-700">Role</label>
                  <select
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  >
                    <option value="CANDIDATE">Candidate</option>
                    <option value="EMPLOYER">Employer</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-0.5 text-sm font-medium text-zinc-700">
                    Job <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addForm.jobId}
                    onChange={(e) => setAddForm({ ...addForm, jobId: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  >
                    <option value="">Select a job…</option>
                    {jobs
                      .filter((j) => String(j.status).toUpperCase() === "OPEN")
                      .map((j) => (
                        <option key={String(j.id)} value={String(j.id)}>
                          {String(j.title)}
                          {j.companyName ? ` — ${String(j.companyName)}` : ""}
                        </option>
                      ))}
                  </select>
                </div>
                <p className="text-xs text-zinc-400 sm:col-span-2">
                  An account + application is created and an AI interview invite is sent automatically — the
                  candidate starts from the link with no signup friction.
                </p>
                <div className="flex justify-end gap-2 sm:col-span-2">
                  <Button variant="outline" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => void addApplicant()} disabled={adding}>
                    {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    Create applicant
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <LayoutGrid className="h-3.5 w-3.5" />
          Admin actions are recorded and require elevated permissions. Partners can never be
          self-declared.
        </div>
      </div>
    </div>
  );
}

function CopyInvite({ token }: { token: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={async () => {
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
        toast("Interview link copied", { type: "success" });
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
      title="Copy AI interview invite link"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

function overallClass(score: number | null): string {
  if (score === null) return "text-zinc-300";
  if (score >= 80) return "text-emerald-600";
  if (score >= 65) return "text-blue-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

function interviewClass(status: string | null): string {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "IN_PROGRESS":
      return "bg-blue-50 text-blue-700 ring-blue-100";
    case "INVITED":
      return "bg-amber-50 text-amber-700 ring-amber-100";
    default:
      return "bg-zinc-100 text-zinc-400 ring-zinc-100";
  }
}

function humanize(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}