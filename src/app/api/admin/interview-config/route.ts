import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getInternRoleByKey, saveRoleConfig } from "@/lib/ai/config";

export const dynamic = "force-dynamic";

// Admin updates a role's interview config (weights, duration, thresholds, settings).
export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Only admins can change interview settings" }, { status: 403 });
  }

  let body: { role?: unknown; data?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const role = String(body.role ?? "");
  const base = getInternRoleByKey(role);
  if (!base) return NextResponse.json({ error: "Unknown role" }, { status: 400 });

  const raw = body.data && typeof body.data === "object" && !Array.isArray(body.data) ? body.data : {};
  const data = sanitize(role, raw as Record<string, unknown>);

  await saveRoleConfig(role, data);
  return NextResponse.json({ ok: true, role });
}

function sanitize(role: string, raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  const num = (v: unknown, d: number): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };
  const bool = (v: unknown, d: boolean): boolean => (typeof v === "boolean" ? v : d);

  out.durationMinutes = clamp(num(raw.durationMinutes, 30), 10, 60);
  out.minDurationMinutes = clamp(num(raw.minDurationMinutes, 20), 5, 55);
  out.maxDurationMinutes = clamp(num(raw.maxDurationMinutes, 35), 10, 90);
  out.maxQuestions = clamp(Math.round(num(raw.maxQuestions, 14)), 4, 30);
  const minQ = clamp(Math.round(num(raw.minQuestions, 8)), 2, 30);
  out.minQuestions = minQ > (out.maxQuestions as number) ? out.maxQuestions : minQ;

  out.recordingEnabled = bool(raw.recordingEnabled, false);
  out.showScoreToCandidate = bool(raw.showScoreToCandidate, false);
  out.retryAllowed = bool(raw.retryAllowed, false);

  out.thresholds = {
    strong: clamp(num((raw.thresholds as Record<string, unknown> | undefined)?.strong, 80), 0, 100),
    consider: clamp(num((raw.thresholds as Record<string, unknown> | undefined)?.consider, 65), 0, 100),
    needsReview: clamp(num((raw.thresholds as Record<string, unknown> | undefined)?.needsReview, 50), 0, 100),
  };

  if (typeof raw.interviewerIntro === "string" && raw.interviewerIntro.trim()) {
    out.interviewerIntro = raw.interviewerIntro.slice(0, 2000);
  }

  if (raw.weights && typeof raw.weights === "object" && !Array.isArray(raw.weights)) {
    const weights: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw.weights as Record<string, unknown>)) {
      const n = num(v, 0);
      if (n > 0) weights[k] = clamp(Math.round(n), 1, 100);
    }
    if (Object.keys(weights).length > 0) out.weights = weights;
  }

  return out;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}