// Deterministic, evidence-based CV screening score (0-100) used on the
// recruiter dashboard. It scores only what is actually present in the parsed
// CV — no AI, no fabricated signals.

import type { Prisma } from "@prisma/client";
import type { CvStructured } from "@/lib/ai/types";

function has(parts: (string | undefined | null)[]): boolean {
  return parts.some((p) => typeof p === "string" && p.trim().length > 0);
}

/** Score a candidate's CV snapshot. `data` is Resume.structuredData, `text` is parsedText. */
export function cvScore(data?: Prisma.JsonValue | null, text?: string | null): number {
  const cv = (data as CvStructured | null | undefined) ?? null;
  const raw = text?.trim() ?? "";

  const checks: { label: string; ok: boolean; weight: number }[] = [
    { label: "Name", ok: has([cv?.name]) || /^[A-Za-z][A-Za-z .'-]{2,}\s+[A-Za-z][A-Za-z .'-]+$/.test(raw.split("\n")[0] ?? ""), weight: 10 },
    { label: "Contact info", ok: has([cv?.email, cv?.phone]) || /[\w.+-]+@[\w-]+\.[\w.]+/.test(raw), weight: 15 },
    { label: "Education", ok: (cv?.education ?? []).some((e) => has([e?.degree, e?.institution])) || /(university|college|b\.?tech|b\.?sc|bachelor|master|degree)/i.test(raw), weight: 15 },
    { label: "Skills", ok: (cv?.skills?.length ?? 0) > 0, weight: 25 },
    { label: "Experience", ok: (cv?.experience ?? []).some((e) => has([e?.role])), weight: 15 },
    { label: "Projects", ok: (cv?.projects ?? []).some((p) => has([p?.name])), weight: 10 },
    { label: "Certifications", ok: (cv?.certifications ?? []).some((c) => has([c?.name])), weight: 5 },
    { label: "Detail depth", ok: raw.length > 300, weight: 5 },
  ];

  const earned = checks.reduce((sum, c) => sum + (c.ok ? c.weight : 0), 0);
  return Math.max(0, Math.min(100, Math.round(earned)));
}

export function blendOverall(cvScoreValue: number, interviewScore: number | null): number | null {
  if (interviewScore === null || interviewScore === undefined) return null;
  return Math.round((cvScoreValue + interviewScore) / 2);
}