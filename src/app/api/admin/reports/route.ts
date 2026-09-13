import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    reports: reports.map((r) => ({
      id: r.id,
      type: r.type,
      targetId: r.targetId,
      reason: r.reason,
      status: r.status,
      date: r.createdAt.toISOString().slice(0, 10),
    })),
  });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  let body: { id?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Report id required" }, { status: 400 });
  }

  await prisma.report.update({
    where: { id: body.id },
    data: { status: String(body.status || "resolved"), resolvedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}