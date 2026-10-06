"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Plus, X, Pencil, Eye, Trash2, Loader2, CheckCircle2, Briefcase, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { CompanyLogo } from "@/components/company-logo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Company, Job } from "@/types";

const JOB_TYPES = ["Full-time", "Internship", "Part-time", "Contract"];
const WORK_MODES = ["On-site", "Hybrid", "Remote"];
const CATEGORIES = [
  "Software Development",
  "Data Science",
  "AI/ML",
  "Cybersecurity",
  "Marketing",
  "Finance",
  "HR",
  "Sales",
  "UI/UX",
  "Product",
  "Operations",
  "Content",
  "Business Development",
];

interface EmployerJob extends Job {
  applications?: number;
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

function EmployerJobsPageContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [showForm, setShowForm] = React.useState(searchParams.get("new") === "1");
  const [submitting, setSubmitting] = React.useState(false);
  const [posted, setPosted] = React.useState(false);
  const [company, setCompany] = React.useState<Company | null>(null);
  const [jobs, setJobs] = React.useState<EmployerJob[]>([]);
  const [skills, setSkills] = React.useState<string[]>([]);
  const [skillInput, setSkillInput] = React.useState("");
  const [form, setForm] = React.useState({
    title: "",
    type: "Full-time",
    workMode: "On-site",
    category: "Software Development",
    location: "",
    salaryMin: "",
    salaryMax: "",
    experience: "0 - 1 year",
    description: "",
    skills: "",
  });

  React.useEffect(() => {
    let mounted = true;
    Promise.all([
      getJSON<{ company: Company | null }>("/api/employer/company"),
      getJSON<{ jobs: EmployerJob[] }>("/api/jobs?mine=1"),
    ]).then(([c, j]) => {
      if (!mounted) return;
      if (c) setCompany(c.company);
      if (j) setJobs(j.jobs);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.salaryMin) {
      toast("Please fill in the required fields", { type: "error" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, skills }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not post job");
      setPosted(true);
      toast("Job posted", {
        type: "success",
        description: `${form.title} is now live and visible to candidates.`,
      });
      setShowForm(false);
      setForm({ ...form, title: "", description: "", salaryMin: "", salaryMax: "" });
      setSkills([]);
      const j = await getJSON<{ jobs: EmployerJob[] }>("/api/jobs?mine=1");
      if (j) setJobs(j.jobs);
    } catch (error) {
      toast("Could not post job", { type: "error", description: error instanceof Error ? error.message : undefined });
    } finally {
      setSubmitting(false);
    }
  };

  const removeJob = async (id: string, title: string) => {
    const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast("Could not delete job", { type: "error" });
      return;
    }
    setJobs((cur) => cur.filter((j) => j.id !== id));
    toast("Job deleted", { type: "success", description: `${title} removed.` });
  };

  const toggleJobStatus = async (job: EmployerJob) => {
    const next = job.status === "open" ? "closed" : "open";
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("Update failed");
      setJobs((cur) => cur.map((j) => (j.id === job.id ? { ...j, status: next } : j)));
      toast(
        next === "closed"
          ? `"${job.title}" closed — candidates can no longer apply.`
          : `"${job.title}" is open for applications again.`,
        { type: "success" },
      );
    } catch {
      toast("Update failed", { type: "error" });
    }
  };

  const addSkill = () => {
    if (!skillInput.trim()) return;
    setSkills([...skills, skillInput.trim()]);
    setSkillInput("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Manage Jobs</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Post openings and review applications in one place.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Close form" : "Post a Job"}
        </Button>
      </div>

      {posted && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm text-emerald-800">
            Your job was posted and is now live. Candidates can find and apply to it immediately.
          </p>
        </div>
      )}

      {showForm && !company && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <Building2 className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            Set up your company profile before posting a job —{" "}
            <Link href="/employer/company" className="font-medium underline">
              go to company settings
            </Link>
          </p>
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
            <Briefcase className="h-4 w-4 text-blue-600" />
            Post a new job
            {company && <span className="text-xs font-normal text-zinc-400">· {company.name}</span>}
          </h2>
          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Job title <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Senior Frontend Engineer"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Job type</label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JOB_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Work mode</label>
                <Select value={form.workMode} onValueChange={(v) => setForm({ ...form, workMode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WORK_MODES.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Category</label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Location</label>
                <Input
                  placeholder="Bengaluru"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Min salary/stipend (₹/yr)</label>
                <Input
                  placeholder="600000"
                  value={form.salaryMin}
                  onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Max salary (₹/yr)</label>
                <Input
                  placeholder="1200000"
                  value={form.salaryMax}
                  onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Experience</label>
                <Select value={form.experience} onValueChange={(v) => setForm({ ...form, experience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["0 - 1 year", "1 - 3 years", "3 - 5 years", "5+ years"].map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Job description <span className="text-red-500">*</span>
                </label>
                <Textarea
                  rows={5}
                  placeholder="Describe the role, responsibilities and what you're looking for."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Skills</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a required skill"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                  />
                  <Button type="button" variant="outline" onClick={addSkill}>
                    Add
                  </Button>
                </div>
                {skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {skills.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700"
                      >
                        {s}
                        <button onClick={() => setSkills(skills.filter((x) => x !== s))} className="text-zinc-400 hover:text-red-500">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Button type="submit" disabled={submitting || !company}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish Job"}
            </Button>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-6 py-4">
          <h2 className="text-base font-semibold text-zinc-900">Active jobs ({jobs.length})</h2>
        </div>
        {jobs.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-zinc-700">No jobs posted yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
              Post your first job to start receiving applications from candidates on UpJob.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50/50 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-6 py-3 font-semibold">Job</th>
                <th className="px-6 py-3 font-semibold hidden lg:table-cell">Applications</th>
                <th className="px-6 py-3 font-semibold hidden md:table-cell">Status</th>
                <th className="px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {jobs.map((j) => (
                <tr key={j.id} className="transition-colors hover:bg-zinc-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {j.companyName && <CompanyLogo name={j.companyName} size="sm" />}
                      <div>
                        <Link href={`/jobs/${j.id}`} className="font-medium text-zinc-900 hover:text-blue-600">
                          {j.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {j.companyName} · {j.location}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-6 py-4 lg:table-cell">
                    <Link href="/employer/applications" className="font-medium text-blue-600 hover:underline">
                      {j.applications ?? 0}
                    </Link>
                  </td>
                  <td className="hidden px-6 py-4 md:table-cell">
                    <Badge variant={j.status === "open" ? "success" : "default"}>
                      {j.status === "open" ? "Open" : "Closed"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/jobs/${j.id}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                        onClick={() => void toggleJobStatus(j)}
                        title={j.status === "open" ? "Close job" : "Reopen job"}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        onClick={() => removeJob(j.id, j.title)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function EmployerJobsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-zinc-500">Loading jobs...</div>}>
      <EmployerJobsPageContent />
    </Suspense>
  );
}