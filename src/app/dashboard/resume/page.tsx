"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { UploadCloud, FileText, Trash2, CheckCircle2, Info, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_CV_SIZE_MB) || 10;

export type ParsedCvSummary = {
  name?: string;
  email?: string;
  phone?: string;
  skills?: string[];
};

export default function ResumeUploadPage() {
  return (
    <Suspense fallback={null}>
      <ResumeUploadForm />
    </Suspense>
  );
}

function ResumeUploadForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard/ai";
  const { toast } = useToast();

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [uploaded, setUploaded] = React.useState<{ fileName: string; parsed: ParsedCvSummary | null } | null>(null);

  React.useEffect(() => {
    fetch("/api/cv", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const primary = data?.resumes?.find((r: { isPrimary: boolean }) => r.isPrimary);
        if (primary) setUploaded({ fileName: primary.fileName, parsed: primary.parsed ?? null });
      })
      .catch(() => {});
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "doc", "docx"].includes(ext ?? "")) {
      setError("Only PDF, DOC or DOCX files are accepted.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_MB} MB.`);
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/cv", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setUploaded({ fileName: data.resume.fileName, parsed: data.resume.parsed ?? null });
      toast("CV uploaded successfully ✓", { type: "success", description: "We parsed and stored your CV." });
      e.target.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const removeLocal = () => {
    setUploaded(null);
    toast("CV removed from view", { type: "info" });
  };

  const parsed = uploaded?.parsed;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Upload your CV</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload your latest CV. Our AI interviewer will use your CV to personalize your interview.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-white p-12 text-center shadow-sm transition-colors hover:border-zinc-400 hover:bg-zinc-50">
            {!busy ? (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                  <UploadCloud className="h-7 w-7 text-emerald-600" />
                </div>
                <p className="mt-4 text-sm font-semibold text-zinc-900">
                  {uploaded ? uploaded.fileName : "Click to upload your CV"}
                </p>
                <p className="mt-1 text-xs text-zinc-400">PDF · DOC · DOCX · max {MAX_MB} MB</p>
              </>
            ) : (
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="mt-3 text-sm font-medium text-zinc-600">Reading your CV…</p>
              </div>
            )}
            <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleUpload} disabled={busy} />
          </label>
          {error && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
              <Info className="h-3.5 w-3.5" />
              {error}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {uploaded && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                <p className="text-sm font-semibold">CV uploaded successfully ✓</p>
              </div>
              {parsed && (
                <div className="mt-3 space-y-2 text-sm text-zinc-700">
                  {parsed.name && <p>Name: <span className="font-medium">{parsed.name}</span></p>}
                  {parsed.email && <p>Email: <span className="font-medium">{parsed.email}</span></p>}
                  {parsed.phone && <p>Phone: <span className="font-medium">{parsed.phone}</span></p>}
                  {parsed.skills && parsed.skills.length > 0 && (
                    <p>Key skills: <span className="font-medium">{parsed.skills.join(", ")}</span></p>
                  )}
                </div>
              )}
              {parsed && (
                <Link
                  href={next}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
                >
                  Continue to AI Interview
                  <Sparkles className="h-4 w-4" />
                </Link>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                  <FileText className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{uploaded ? uploaded.fileName : "No CV yet"}</p>
                  <p className="text-xs text-zinc-400">{uploaded ? "Primary CV · parsed for AI interview" : "Upload to personalize your interview"}</p>
                </div>
              </div>
              {uploaded && (
                <Button variant="ghost" size="sm" onClick={removeLocal}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">What happens next</h2>
            <ol className="mt-3 space-y-2 text-sm text-zinc-600">
              {[
                "We safely store your file and extract its text.",
                "Our AI reads your CV and builds a personalized interview plan.",
                "You take a ~30-minute adaptive AI video interview.",
                "Your questions will reference your projects, skills and experience.",
              ].map((step, i) => (
                <li key={step} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-600">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}