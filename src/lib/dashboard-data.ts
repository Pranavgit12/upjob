import { prisma } from "@/lib/prisma";
import { INITIAL_PROFILE } from "@/lib/profile";
import type { Application, CandidateProfile } from "@/types";

export interface DashboardOverviewData {
  applicationCount: number;
  interviewCount: number;
  savedJobCount: number;
  profile: CandidateProfile;
  applications: Application[];
}

const STATUS_LABELS: Record<string, Application["status"]> = {
  APPLIED: "Applied",
  UNDER_REVIEW: "Under Review",
  SHORTLISTED: "Shortlisted",
  INTERVIEW: "Interview",
  SELECTED: "Selected",
  REJECTED: "Rejected",
};

export async function getDashboardOverview(userId: string): Promise<DashboardOverviewData> {
  const [recentApplications, applicationCounts, storedValues] = await Promise.all([
    prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        status: true,
        createdAt: true,
        job: {
          select: {
            id: true,
            title: true,
            company: { select: { name: true } },
          },
        },
      },
    }),
    prisma.application.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.userStore.findMany({
      where: { userId, key: { in: ["profile", "savedJobs"] } },
      select: { key: true, value: true },
    }),
  ]);

  const applicationCount = applicationCounts.reduce((sum, row) => sum + row._count._all, 0);
  const interviewCount = applicationCounts
    .filter((row) => row.status === "INTERVIEW" || row.status === "SHORTLISTED")
    .reduce((sum, row) => sum + row._count._all, 0);
  const profileValue = storedValues.find((row) => row.key === "profile")?.value;
  const savedJobsValue = storedValues.find((row) => row.key === "savedJobs")?.value;
  const profile = (profileValue ?? INITIAL_PROFILE) as CandidateProfile;

  return {
    applicationCount,
    interviewCount,
    savedJobCount: Array.isArray(savedJobsValue) ? savedJobsValue.length : 0,
    profile,
    applications: recentApplications.map((application) => ({
      id: application.id,
      jobId: application.job.id,
      jobTitle: application.job.title,
      companyId: "",
      companyName: application.job.company?.name ?? "",
      appliedDate: application.createdAt.toISOString().slice(0, 10),
      status: STATUS_LABELS[application.status] ?? "Applied",
    })),
  };
}
