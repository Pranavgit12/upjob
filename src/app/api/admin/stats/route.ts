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

  const [companies, users, jobs, applications, reports, openReports] = await Promise.all([
    prisma.company.count(),
    prisma.user.count(),
    prisma.job.count(),
    prisma.application.count(),
    prisma.report.count(),
    prisma.report.count({ where: { status: { in: ["open", "reviewing"] } } }),
  ]);

  return NextResponse.json({
    stats: {
      companies,
      users,
      jobs,
      applications,
      reports,
      openReports,
    },
  });
}