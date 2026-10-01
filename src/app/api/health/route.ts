import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Container health probe. Deliberately unauthenticated and deliberately cheap:
 * it reports process liveness plus DB reachability, and nothing else.
 *
 * Do not add configuration or version details here — it is publicly reachable.
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", db: "up", latencyMs: Date.now() - startedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "degraded", db: "down" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
