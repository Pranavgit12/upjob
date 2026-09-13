"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

const ACTIONS: { status: string; label: string; tone: string }[] = [
  { status: "UNDER_REVIEW", label: "Mark review", tone: "border-zinc-200 text-zinc-700 hover:bg-zinc-50" },
  { status: "SHORTLISTED", label: "Shortlist", tone: "bg-emerald-600 text-white hover:bg-emerald-700" },
  { status: "INTERVIEW", label: "Next round", tone: "bg-blue-600 text-white hover:bg-blue-700" },
  { status: "SELECTED", label: "Select", tone: "bg-black text-white hover:bg-zinc-800" },
  { status: "REJECTED", label: "Reject", tone: "border-red-200 text-red-600 hover:bg-red-50" },
];

export function AdminInterviewActions({
  applicationId,
  interviewId,
  applicationStatus,
  interviewStatus,
  initialNote,
}: {
  applicationId: string;
  interviewId: string;
  applicationStatus: string;
  interviewStatus: string;
  initialNote: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [note, setNote] = React.useState(initialNote);
  const [saved, setSaved] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState(initialNote);

  const apply = async (status: string) => {
    setPending(status);
    const res = await fetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setPending(null);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  };

  const saveNote = async () => {
    setSaved(false);
    const res = await fetch(`/api/admin/interviews/${interviewId}/note`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Couldn't save the note.");
      return;
    }
    setLastSaved(note);
    setSaved(true);
    router.refresh();
  };

  return (
    <div className="mt-6 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-zinc-900">AI Interview:</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${interviewStatus === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : interviewStatus === "IN_PROGRESS" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
            {interviewStatus === "COMPLETED" ? "Completed" : interviewStatus === "IN_PROGRESS" ? "In progress" : "Invited"}
          </span>
        </div>
        <p className="text-xs text-zinc-400">
          Decision by you — the AI score is advisory only.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Application status</span>
        {ACTIONS.map((a) => (
          <button
            key={a.status}
            disabled={pending !== null}
            onClick={() => apply(a.status)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 ${a.tone} ${applicationStatus === a.status ? "ring-2 ring-zinc-900 ring-offset-1" : ""}`}
          >
            {pending === a.status ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : a.status === applicationStatus ? <Check className="h-3.5 w-3.5" /> : null}
            {a.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2">
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setSaved(false);
          }}
          rows={2}
          placeholder="Internal HR note (not shared with the candidate)…"
          className="w-full max-w-lg rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-blue-500"
        />
        <button
          onClick={saveNote}
          disabled={pending !== null || (!saved && note === lastSaved)}
          className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-zinc-700"
        >
          {saved ? "Saved" : "Save note"}
        </button>
      </div>
    </div>
  );
}