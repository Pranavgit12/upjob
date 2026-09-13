import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadRoleConfig } from "@/lib/ai/config";
import { getInternRoleKey } from "@/lib/interview";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  const interview = await prisma.aiInterview.findUnique({
    where: { inviteToken: token },
    include: {
      interviewer: { select: { id: true, name: true, image: true, description: true, voiceHint: true } },
      application: {
        include: {
          job: { select: { title: true, company: { select: { name: true, logo: true } } } },
          user: {
            select: {
              name: true,
              resumes: {
                where: { isPrimary: true },
                select: { fileName: true, parsedText: true, structuredData: true },
                take: 1,
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      },
    },
  });
  if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });

  const roleKey = getInternRoleKey(interview.application.job.title);
  const roleConfig = await loadRoleConfig(roleKey);

  const now = Date.now();
  const startedMs = interview.startedAt?.getTime() ?? null;
  const elapsedSeconds =
    startedMs && interview.status === "IN_PROGRESS"
      ? Math.max(0, Math.round((now - startedMs) / 1000))
      : null;
  const durationSec = (roleConfig?.durationMinutes ?? interview.durationMinutes) * 60;
  const remainingSeconds = elapsedSeconds === null ? null : Math.max(0, durationSec - elapsedSeconds);

  const resume = interview.application.user.resumes[0];
  return NextResponse.json({
    status: interview.status,
    jobTitle: interview.application.job.title,
    companyName: interview.application.job.company.name,
    companyLogo: interview.application.job.company.logo,
    candidateName: interview.application.user.name,
    durationMinutes: roleConfig?.durationMinutes ?? interview.durationMinutes,
    minDurationMinutes: roleConfig?.minDurationMinutes ?? 20,
    maxDurationMinutes: roleConfig?.maxDurationMinutes ?? 35,
    phases: roleConfig?.phases ?? [],
    elapsedSeconds,
    remainingSeconds,
    startedAt: interview.startedAt?.toISOString() ?? null,
    completedAt: interview.completedAt?.toISOString() ?? null,
    currentPhase: interview.currentPhase,
    currentStep: interview.currentStep,
    questionCount: interview.maxSteps,
    questionPlan: Array.isArray(interview.questions)
      ? interview.questions.map((question, index) => ({
          questionId: typeof question === "object" && question !== null && "questionId" in question
            ? String((question as { questionId?: unknown }).questionId ?? `question-${index + 1}`)
            : `question-${index + 1}`,
          question: typeof question === "object" && question !== null && "question" in question
            ? String((question as { question?: unknown }).question ?? "")
            : "",
        })).filter((question) => question.question.length > 0)
      : [],
    consentAccepted: Boolean(interview.consentAcceptedAt),
    recordingConsent: interview.recordingConsent,
    recordingEnabled: Boolean(roleConfig?.recordingEnabled),
    hasCv: Boolean(resume?.parsedText),
    resumeFileName: resume?.fileName ?? null,
    process: interview.status === "COMPLETED" ? "completed" : "idle",
    interviewer: interview.interviewer
      ? {
          name: interview.interviewer.name,
          image: interview.interviewer.image,
          description: interview.interviewer.description,
          voiceHint: interview.interviewer.voiceHint,
        }
      : null,
  });
}