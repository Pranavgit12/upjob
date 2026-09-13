import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { cvScore, blendOverall } from "@/lib/cv-score";
import { EmployerApplications } from "@/components/employer-applications";

export const dynamic = "force-dynamic";

type CatScores = Record<string, number>;

export default async function EmployerApplicationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/employer/applications");
  if (user.role !== "employer" && user.role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-sm font-medium text-zinc-500">This area is for employers.</p>
        <p className="mt-1 text-sm text-zinc-400">Sign in with an employer or admin account to review interview candidates.</p>
      </div>
    );
  }

  const where = user.role === "employer" ? { job: { createdBy: user.id } } : {};
  const rows = await prisma.application.findMany({
    where,
    include: {
      user: { select: { name: true, email: true, phone: true } },
      job: { select: { title: true, company: { select: { name: true } } } },
      resume: {
        select: { fileName: true, fileUrl: true, parsedText: true, structuredData: true },
      },
      aiInterview: {
        select: {
          id: true,
          inviteToken: true,
          status: true,
          currentStep: true,
          maxSteps: true,
          score: true,
          recommendation: true,
          summary: true,
          categoryScores: true,
          strengths: true,
          concerns: true,
          messages: {
            orderBy: { createdAt: "asc" },
            select: { id: true, role: true, content: true, createdAt: true },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const applications = rows.map((a) => {
    const cvScoreValue = cvScore(a.resume?.structuredData ?? null, a.resume?.parsedText ?? null);
    return {
      id: a.id,
      candidateName: a.user.name || "Candidate",
      candidateEmail: a.user.email,
      candidatePhone: a.user.phone,
      jobTitle: a.job.title,
      companyName: a.job.company.name,
      status: a.status,
      recruiterNotes: a.recruiterNotes,
      appliedAt: a.createdAt.toISOString(),
      resumeFileName: a.resume?.fileName ?? null,
      resumeUrl: a.resume?.fileUrl ?? null,
      cvScore: cvScoreValue,
      interview: a.aiInterview
        ? {
            id: a.aiInterview.id,
            token: a.aiInterview.inviteToken,
            status: a.aiInterview.status,
            currentStep: a.aiInterview.currentStep,
            maxSteps: a.aiInterview.maxSteps,
            score: a.aiInterview.score,
            overall: blendOverall(cvScoreValue, a.aiInterview.score),
            recommendation: a.aiInterview.recommendation,
            summary: a.aiInterview.summary,
            categoryScores: (a.aiInterview.categoryScores ?? {}) as CatScores,
            strengths: a.aiInterview.strengths ?? [],
            concerns: a.aiInterview.concerns ?? [],
            transcript: (a.aiInterview.messages ?? []).map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              createdAt: m.createdAt.toISOString(),
            })),
          }
        : null,
    };
  });

  const completed = applications.filter((a) => a.interview?.status === "COMPLETED").length;
  const waiting = applications.filter((a) => a.interview?.status === "INVITED").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Applications</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Candidates who applied to your jobs, with their CV + AI interview results.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4">
        <Stat label="Total applications" value={applications.length} />
        <Stat label="Invited" value={waiting} />
        <Stat label="AI interviews completed" value={completed} />
      </div>

      <div className="mt-6">
        {applications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
            <p className="text-sm font-medium text-zinc-600">No applications yet</p>
            <p className="mt-1 text-sm text-zinc-400">
              Applications from candidates will appear here once they apply to your jobs.
            </p>
          </div>
        ) : (
          <EmployerApplications applications={applications} />
        )}
      </div>

      <p className="mt-4 text-xs text-zinc-400">
        AI results are decision-support only. Review the report and reach out before making a final call.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
    </div>
  );
}

export type EmployerApplication = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string | null;
  jobTitle: string;
  companyName: string;
  status: string;
  recruiterNotes: string | null;
  appliedAt: string;
  resumeFileName: string | null;
  resumeUrl: string | null;
  cvScore: number;
  interview: {
    id: string;
    token: string;
    status: "INVITED" | "IN_PROGRESS" | "COMPLETED" | "EXPIRED";
    currentStep: number;
    maxSteps: number;
    score: number | null;
    overall: number | null;
    recommendation: string | null;
    summary: string | null;
    categoryScores: Record<string, number>;
    strengths: string[];
    concerns: string[];
    transcript: { id: string; role: string; content: string; createdAt: string }[];
  } | null;
};