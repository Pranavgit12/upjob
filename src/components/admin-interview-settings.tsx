"use client";

import React from "react";
import { Loader2, Save } from "lucide-react";

interface RoleConfig {
  key: string;
  title: string;
  durationMinutes: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  maxQuestions: number;
  minQuestions: number;
  weights: Record<string, number>;
  thresholds: { strong: number; consider: number; needsReview: number };
  recordingEnabled: boolean;
  showScoreToCandidate: boolean;
  retryAllowed: boolean;
  interviewerIntro: string;
}

export function AdminInterviewSettings({ roles }: { roles: RoleConfig[] }) {
  const [activeKey, setActiveKey] = React.useState(roles[0]?.key ?? "");
  const [drafts, setDrafts] = React.useState<Record<string, RoleConfig>>(() =>
    Object.fromEntries(roles.map((r) => [r.key, r])),
  );
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const active = drafts[activeKey];
  if (!active) return null;

  const set = (patch: Partial<RoleConfig>) => {
    setDrafts((prev) => ({ ...prev, [activeKey]: { ...prev[activeKey], ...patch } }));
    setMessage(null);
  };

  const setNum = (key: keyof RoleConfig, value: number) => {
    set({ [key]: value } as Partial<RoleConfig>);
  };

  const setWeight = (name: string, value: number) => {
    set({
      weights: { ...active.weights, [name]: Math.max(0, Math.round(value) || 0) },
    });
  };

  const setThreshold = (name: keyof RoleConfig["thresholds"], value: number) => {
    set({
      thresholds: { ...active.thresholds, [name]: Math.max(0, Math.min(100, Math.round(value) || 0)) },
    });
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/interview-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: active.key, data: active }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setMessage(data?.error ?? "Couldn't save. Please try again.");
      return;
    }
    setMessage("Saved. New interviews will use these settings.");
  };

  return (
    <div className="mt-6">
      <div className="flex gap-2">
        {roles.map((r) => (
          <button
            key={r.key}
            onClick={() => setActiveKey(r.key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeKey === r.key ? "bg-black text-white" : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {r.title}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-6">
        <Section title="Timing">
          <Grid>
            <Numeric label="Target duration (min)" value={active.durationMinutes} onChange={(v) => setNum("durationMinutes", v)} />
            <Numeric label="Min duration (min)" value={active.minDurationMinutes} onChange={(v) => setNum("minDurationMinutes", v)} />
            <Numeric label="Max duration (min)" value={active.maxDurationMinutes} onChange={(v) => setNum("maxDurationMinutes", v)} />
            <Numeric label="Max questions" value={active.maxQuestions} onChange={(v) => setNum("maxQuestions", v)} />
            <Numeric label="Min questions" value={active.minQuestions} onChange={(v) => setNum("minQuestions", v)} />
          </Grid>
        </Section>

        <Section title="Behavior">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Toggle label="Allow candidate to retry questions" checked={active.retryAllowed} onChange={(v) => set({ retryAllowed: v })} />
            <Toggle label="Record video with consent" checked={active.recordingEnabled} onChange={(v) => set({ recordingEnabled: v })} />
            <Toggle label="Show score to candidate at the end" checked={active.showScoreToCandidate} onChange={(v) => set({ showScoreToCandidate: v })} />
          </div>
        </Section>

        <Section title="Scoring thresholds (overall score)">
          <Grid>
            <Numeric label="Strong candidate (send to next round)" value={active.thresholds.strong} onChange={(v) => setThreshold("strong", v)} />
            <Numeric label="Consider" value={active.thresholds.consider} onChange={(v) => setThreshold("consider", v)} />
            <Numeric label="Needs review" value={active.thresholds.needsReview} onChange={(v) => setThreshold("needsReview", v)} />
          </Grid>
        </Section>

        <Section title="Category weights (sum drives the overall score)">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.entries(active.weights).map(([name, weight]) => (
              <label key={name} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 px-3 py-2.5">
                <span className="text-sm text-zinc-700">{name}</span>
                <input
                  type="number"
                  value={weight}
                  min={0}
                  max={100}
                  onChange={(e) => setWeight(name, Number(e.target.value))}
                  className="w-20 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-800"
                />
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-400">Weights are re-normalized automatically before scoring.</p>
        </Section>

        <Section title="Interviewer opening message">
          <textarea
            value={active.interviewerIntro}
            rows={3}
            onChange={(e) => set({ interviewerIntro: e.target.value })}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-blue-500"
          />
        </Section>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save {active.title} settings
          </button>
          {message && <span className="text-sm text-zinc-600">{message}</span>}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function Numeric({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-500">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-blue-500"
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 px-3 py-2.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-zinc-900" />
      <span className="text-sm text-zinc-700">{label}</span>
    </label>
  );
}