"use client";

import * as React from "react";
import { Building2, BadgeCheck, Save, Loader2, UploadCloud, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { CompanyLogo } from "@/components/company-logo";
import type { Company } from "@/types";

interface CompanyPayload {
  name: string;
  industry: string;
  location: string;
  website: string;
  description: string;
  companySize?: string;
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

export default function EmployerCompanyPage() {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [company, setCompany] = React.useState<Company | null>(null);
  const [form, setForm] = React.useState<CompanyPayload>({
    name: "",
    industry: "Technology",
    location: "",
    website: "",
    description: "",
    companySize: "",
  });

  React.useEffect(() => {
    let mounted = true;
    getJSON<{ company: Company | null }>("/api/employer/company").then((data) => {
      if (!mounted) return;
      const c = data?.company ?? null;
      setCompany(c);
      if (c) {
        setForm({
          name: c.name,
          industry: c.industry,
          location: c.location,
          website: c.website ?? "",
          description: c.description,
          companySize: c.companySize,
        });
      }
      setLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const completedCount = ["name", "industry", "location"].filter((k) => form[k as keyof CompanyPayload]?.trim()).length;
  const progress = Math.round((completedCount / 3) * 100);

  const save = async () => {
    if (!form.name.trim()) {
      toast("Company name is required", { type: "error" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/employer/company", {
        method: company ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not save company");
      setCompany(data.company);
      setForm((f) => ({ ...f, name: data.company.name }));
      toast(company ? "Company profile saved" : "Company created", { type: "success" });
    } catch (error) {
      toast("Could not save company", { type: "error", description: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-zinc-100" />
        <div className="h-40 animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Company Profile</h1>
        <p className="mt-1 text-sm text-zinc-500">
          A complete company profile attracts more qualified applications.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-white">
              {form.name ? <CompanyLogo name={form.name} size="xl" /> : <Building2 className="h-7 w-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold text-zinc-900">{form.name || "Your company"}</p>
                {company?.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-100">
                    <BadgeCheck className="h-3 w-3" />
                    Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500">
                {company ? `Profile ${progress}% complete` : "Set up your company to start posting jobs"}
              </p>
            </div>
          </div>
          {company && (
            <label className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50">
              <UploadCloud className="mr-1 inline h-3.5 w-3.5" />
              Upload logo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    toast("Logo upload coming soon", { type: "info" });
                  }
                }}
              />
            </label>
          )}
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">Company details</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Company name</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Industry</label>
            <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Location</label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Website</label>
            <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">About the company</label>
            <Textarea
              rows={5}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
        <Button className="mt-4" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {company ? "Save changes" : "Create company profile"}
        </Button>
      </div>

      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">Verification & trust</h2>
        {company ? (
          company.isVerified ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Company verified — no action needed</p>
                <p className="mt-1 text-xs leading-5 text-emerald-700">
                  Your postings display trust badges and rank higher in candidate searches. Verified
                  partnerships are reviewed by UpJob and can never be self-declared.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
              <div>
                <p className="text-sm font-semibold text-zinc-700">Verification pending</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Your profile is live. Verification is reviewed by the UpJob team.
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
            <div>
              <p className="text-sm font-semibold text-zinc-700">Complete your profile to get verified</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Once your company is live, the UpJob team reviews it and marks it as verified.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}