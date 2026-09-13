import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { INTERN_ROLES } from "@/data/intern-roles";
import { AiPortalClient } from "@/components/ai-portal-client";

export const dynamic = "force-dynamic";

export default async function DashboardAiPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard/ai");

  const [jobs, applications, resumes] = await Promise.all([
    prisma.job.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "asc" },
      include: { company: { select: { name: true, logo: true } } },
    }),
    prisma.application.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        job: { select: { id: true, title: true, company: { select: { name: true, logo: true } } } },
        aiInterview: {
          select: {
            inviteToken: true,
            status: true,
            startedAt: true,
            completedAt: true,
            currentStep: true,
            maxSteps: true,
          },
        },
      },
    }),
    prisma.resume.findMany({
      where: { userId: user.id, isPrimary: true },
      take: 1,
      orderBy: { createdAt: "desc" },
      select: { id: true, fileName: true, parsedText: true },
    }),
  ]);

  const roleJobs = INTERN_ROLES.map((role) => {
    const job = jobs.find((j) => {
      const t = j.title.toLowerCase();
      return role.key === "frontend-developer-intern"
        ? t.includes("frontend")
        : role.key === "bde-intern" && (t.includes("business development") || t.includes("bde"));
    });
    if (!job) return null;
    const app = applications.find((a) => a.jobId === job.id);
    return { role, job, app: app ?? null };
  }).filter((x): x is NonNullable<typeof x> => Boolean(x));

  return (
    <AiPortalClient
      userName={user.name.split(" ")[0] ?? "there"}
      hasPrimaryCv={Boolean(resumes[0]?.parsedText)}
      resumeFileName={resumes[0]?.fileName ?? null}
      roleJobs={roleJobs.map(({ role, job, app }) => ({
        role: {
          key: role.key,
          title: role.title,
          stipend: role.stipend,
          tagline: role.tagline,
          shortDescription: role.shortDescription,
          requiredSkills: role.requiredSkills,
          location: role.location,
          workMode: role.workMode,
          phases: role.phases,
          durationMinutes: role.durationMinutes,
        },
        job: {
          id: job.id,
          title: job.title,
          salaryMin: job.salaryMin,
          company: { name: job.company.name, logo: job.company.logo },
        },
        app: app
          ? {
              id: app.id,
              status: app.status,
              interview: app.aiInterview
                ? {
                    token: app.aiInterview.inviteToken,
                    status: app.aiInterview.status,
                    startedAt: app.aiInterview.startedAt?.toISOString() ?? null,
                    completedAt: app.aiInterview.completedAt?.toISOString() ?? null,
                    currentStep: app.aiInterview.currentStep,
                    maxSteps: app.aiInterview.maxSteps,
                  }
                : null,
            }
          : null,
      }))}
    />
  );
}