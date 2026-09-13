"use client";

import * as React from "react";
import { CheckCircle2, UploadCloud, FileCheck2, Loader2, ArrowRight, ArrowLeft, Bot, Timer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { AuthRequiredError } from "@/lib/store";
import { useRouter } from "next/navigation";

interface ApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
  companyName: string;
  companyId: string;
}

const FIELDS = [
  { key: "name", label: "Full Name", type: "text", placeholder: "Your full name", required: true },
  { key: "email", label: "Email", type: "email", placeholder: "you@example.com", required: true },
  { key: "phone", label: "Phone", type: "tel", placeholder: "+91 98765 43210", required: true },
  { key: "location", label: "Location", type: "text", placeholder: "City, Country", required: false },
  { key: "education", label: "Education", type: "text", placeholder: "e.g. B.Tech Computer Science", required: true },
  { key: "college", label: "College / University", type: "text", placeholder: "Your college", required: false },
  { key: "graduationYear", label: "Graduation Year", type: "text", placeholder: "e.g. 2027", required: false },
  { key: "experience", label: "Experience", type: "text", placeholder: "e.g. 1 year frontend", required: false },
  { key: "skills", label: "Skills (comma separated)", type: "text", placeholder: "React, TypeScript, Git", required: false },
  { key: "portfolio", label: "Portfolio / GitHub", type: "url", placeholder: "https://", required: false },
  { key: "linkedin", label: "LinkedIn URL", type: "url", placeholder: "https://linkedin.com/in/", required: false },
] as const;

export function ApplicationModal({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  companyName,
}: ApplicationModalProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [step, setStep] = React.useState<"form" | "submitting" | "interview" | "success">("form");
  const [form, setForm] = React.useState<Record<string, string>>({});
  const [resume, setResume] = React.useState<string | null>(null);
  const [resumeError, setResumeError] = React.useState<string | null>(null);
  const [interviewToken, setInterviewToken] = React.useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setStep("form");
      setForm({
        name: "",
        email: "",
        phone: "",
        location: "",
        education: "",
        college: "",
        graduationYear: "",
        experience: "",
        skills: "",
        portfolio: "",
        linkedin: "",
        coverLetter: "",
      });
      setResume(null);
      setResumeError(null);
      setInterviewToken(null);
    }
    onOpenChange(next);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setResumeError(null);
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setResumeError("Only PDF files are accepted.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setResumeError("Resume must be under 5 MB.");
      return;
    }
    setResume(file.name);
    toast("Resume selected", { type: "success", description: file.name });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const required = ["name", "email", "phone", "education"];
    for (const field of required) {
      if (!form[field]?.trim()) {
        toast(`Please fill in ${field}`, { type: "error" });
        return;
      }
    }
    if (!resume) {
      toast("Please upload your resume", { type: "error" });
      return;
    }
    setStep("submitting");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          coverLetter: form.coverLetter ?? "",
          name: form.name ?? "",
          phone: form.phone ?? "",
        }),
      });
      if (res.status === 401) {
        onOpenChange(false);
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not submit application");

      if (data.interview?.inviteToken && !data.alreadyApplied) {
        setInterviewToken(data.interview.inviteToken);
        setStep("interview");
      } else {
        setStep("success");
      }
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        onOpenChange(false);
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      toast("Could not submit application", { type: "error", description: "Please try again." });
      setStep("form");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {step === "interview" ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-50">
              <Bot className="h-10 w-10 text-violet-600" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-zinc-900">Application received</h2>
            <p className="mt-2 max-w-sm text-sm text-zinc-500">
You’re in! Before your application reaches <span className="font-medium text-zinc-800">{companyName}</span>,
                complete your{" "}
                <span className="font-medium text-zinc-800">~15-minute AI interview</span> — a quick
                chat that helps the employer understand your background.
            </p>
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-violet-50/70 px-4 py-2.5 text-xs font-medium text-violet-700">
              <Timer className="h-4 w-4" />
              ~15 minutes · ~7 questions · Reviewed by employer
            </div>
            <Button
              className="mt-6"
              size="lg"
              onClick={() => {
                onOpenChange(false);
                router.push(`/interview/${interviewToken}/check`);
              }}
            >
              Start AI interview
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : step === "success" ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-zinc-900">Application Submitted</h2>
            <p className="mt-2 max-w-sm text-sm text-zinc-500">
              Your application for <span className="font-medium text-zinc-800">{jobTitle}</span> at{" "}
              {companyName} has been submitted. Track its status anytime from your dashboard.
            </p>
            <Button
              className="mt-6"
              onClick={() => {
                onOpenChange(false);
                router.push("/dashboard/applications");
              }}
            >
              Go to My Applications
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Apply to {companyName}</DialogTitle>
              <DialogDescription>
                Complete your application for <span className="font-medium text-zinc-700">{jobTitle}</span>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {FIELDS.map((field) => (
                  <div key={field.key} className={field.key === "portfolio" || field.key === "linkedin" ? "sm:col-span-2" : ""}>
                    <label className="mb-1.5 flex items-center gap-0.5 text-sm font-medium text-zinc-700">
                      {field.label}
                      {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <Input
                      type={field.type}
                      value={form[field.key] ?? ""}
                      placeholder={field.placeholder}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      required={field.required}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 flex items-center gap-0.5 text-sm font-medium text-zinc-700">
                    Resume <span className="text-red-500">*</span>
                    <span className="ml-1 text-xs font-normal text-zinc-400">(PDF, max 5 MB)</span>
                  </label>
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-5 transition-colors hover:border-zinc-300 hover:bg-zinc-50">
                    {resume ? (
                      <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                        <FileCheck2 className="h-5 w-5" />
                        {resume}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center">
                        <UploadCloud className="mb-1 h-6 w-6 text-zinc-400" />
                        <span className="text-sm font-medium text-zinc-600">Click to upload resume</span>
                        <span className="text-xs text-zinc-400">Drag & drop or browse files</span>
                      </div>
                    )}
                    <input type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
                  </label>
                  {resumeError && <p className="mt-1 text-xs text-red-600">{resumeError}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 flex items-center gap-0.5 text-sm font-medium text-zinc-700">
                    Cover Letter
                    <span className="ml-1 text-xs font-normal text-zinc-400">(optional)</span>
                  </label>
                  <Textarea
                    rows={4}
                    placeholder="Why are you a great fit for this role?"
                    value={form.coverLetter ?? ""}
                    onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  <ArrowLeft className="h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={step === "submitting"}>
                  {step === "submitting" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}