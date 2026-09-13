// Application ↔ AiInterview orchestration for the UpJob AI video interview.
// Employer creates an interview per application (invite link); the candidate
// completes consent + system check, then runs the adaptive Gemini interview.
// Completion triggers real evaluation + report generation (no fake scores).

import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  evaluateInterview,
  generateInterviewPlan,
  getPlanFromInterview,
  nextAiTurn,
  parseCV,
  type TurnState,
} from "@/lib/ai/service";
import { emptyIntegrity, type CvStructured, type IntegritySummary } from "@/lib/ai/types";
import { getInternRoleByKey, loadRoleConfig } from "@/lib/ai/config";
import type { Prisma } from "@prisma/client";
import type { InternRoleConfig } from "@/data/intern-roles";

export const DEFAULT_DURATION_MINUTES = 30;
export const DEFAULT_MAX_STEPS = 10;

const INTERVIEWER_BY_ROLE: Record<string, string> = {
  "frontend-developer-intern": "maya-warm",
  "bde-intern": "elena-energy",
};

export function generateInviteToken(): string {
  return randomBytes(18).toString("base64url");
}

export async function getInterviewWithContext(token: string) {
  return prisma.aiInterview.findUnique({
    where: { inviteToken: token },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      application: {
        include: {
          job: { include: { company: { select: { name: true, logo: true } } } },
          user: {
            include: {
              resumes: { where: { isPrimary: true }, take: 1, orderBy: { createdAt: "desc" } },
            },
          },
        },
      },
    },
  });
}

export interface PreparedInterview {
  roleConfig: InternRoleConfig;
  cv: CvStructured;
  cvText: string;
  plan: ReturnType<typeof getPlanFromInterview>;
}

/** Build role config + CV snapshot for an interview. Deterministic, no AI calls. */
export async function prepareInterview(interview: {
  application: {
    job: { title: string };
    user: { resumes: { parsedText: string | null; structuredData: Prisma.JsonValue | null }[] };
  };
}): Promise<PreparedInterview> {
  const baseRole = getInternRoleByKey(getInternRoleKey(interview.application.job.title));
  if (!baseRole) throw new Error("Unsupported role");
  const roleConfig = (await loadRoleConfig(baseRole.key)) ?? baseRole;
  const resume = interview.application.user.resumes[0];
  const cv: CvStructured = (resume?.structuredData as CvStructured | null) ?? emptyIntegritySafe();
  const cvText = resume?.parsedText?.slice(0, 6000) ?? "";
  return {
    roleConfig,
    cv,
    cvText,
    plan: [],
  };
}

function emptyIntegritySafe(): CvStructured {
  return { education: [], skills: [], technologies: [], experience: [], internships: [], projects: [], certifications: [], achievements: [] };
}

export function getInternRoleKey(jobTitle: string): string {
  const t = jobTitle.toLowerCase();
  if (t.includes("business development") || t.includes("bde")) return "bde-intern";
  if (t.includes("frontend")) return "frontend-developer-intern";
  return "frontend-developer-intern";
}

/** Create (or reuse) the AI interview for an application. No heavy AI work here. */
export async function createAiInterviewForApplication(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { job: true },
  });
  if (!application) throw new Error("Application not found");

  const roleKey = getInternRoleKey(application.job.title);
  const roleConfig = await loadRoleConfig(roleKey);
  const interviewerKey = INTERVIEWER_BY_ROLE[roleKey] ?? "maya-warm";
  const interviewer = await prisma.interviewer.findUnique({ where: { key: interviewerKey } });

  const existing = await prisma.aiInterview.findUnique({
    where: { applicationId },
    select: { id: true, inviteToken: true, status: true },
  });
  if (existing && existing.status !== "EXPIRED") {
    return { interviewId: existing.id, inviteToken: existing.inviteToken, existing: true };
  }
  if (existing?.status === "EXPIRED") {
    await prisma.aiInterviewAnswer.deleteMany({ where: { interviewId: existing.id } });
    await prisma.aiInterviewMessage.deleteMany({ where: { interviewId: existing.id } });
    await prisma.aiInterview.delete({ where: { id: existing.id } });
  }

  const interview = await prisma.aiInterview.create({
    data: {
      applicationId: application.id,
      inviteToken: generateInviteToken(),
      interviewerId: interviewer?.id,
      durationMinutes: roleConfig?.durationMinutes ?? DEFAULT_DURATION_MINUTES,
      maxSteps: roleConfig?.maxQuestions ?? DEFAULT_MAX_STEPS,
      status: "INVITED",
      config: roleConfig ? (roleConfig as unknown as Prisma.InputJsonValue) : undefined,
    },
  });

  return { interviewId: interview.id, inviteToken: interview.inviteToken, existing: false };
}

/** Consent + system-check gate. Generates the personalized plan on first start. */
export async function startInterview(
  token: string,
  consent: { agreed: boolean; recordingConsent: boolean }
): Promise<{ status: string; startedAt: string; resuming: boolean }> {
  const interview = await getInterviewWithContext(token);
  if (!interview) throw new NotFoundError("Interview not found");
  if (interview.status === "COMPLETED") throw new ConflictError("Interview already completed");
  if (interview.status === "EXPIRED") throw new ConflictError("Interview link is no longer active");
  if (!consent.agreed) throw new ValidationError("Consent is required before starting the interview");

  if (!interview.questions && interview.application.user.resumes[0]?.parsedText) {
    const prepared = await prepareInterview(interview );
    if (prepared.roleConfig) {
      const name = interview.application.user.name?.split(" ")[0] ?? "there";
      const plan = await generateInterviewPlan(
        prepared.roleConfig,
        prepared.cv,
        name || "there"
      );
      await prisma.aiInterview.update({
        where: { id: interview.id },
        data: { questions: plan as unknown as Prisma.InputJsonValue, maxSteps: plan.length },
      });
      interview.questions = plan as unknown as Prisma.JsonValue;
    }
  }

  const wasInvited = interview.status === "INVITED";
  const now = new Date();
  if (wasInvited) {
    await prisma.aiInterview.update({
      where: { id: interview.id },
      data: {
        status: "IN_PROGRESS",
        startedAt: now,
        consentAcceptedAt: now,
        recordingConsent: consent.recordingConsent,
      },
    });
  } else {
    await prisma.aiInterview.update({
      where: { id: interview.id },
      data: { consentAcceptedAt: now, recordingConsent: consent.recordingConsent },
    });
  }

  return {
    status: wasInvited ? "IN_PROGRESS" : interview.status,
    startedAt: (wasInvited ? now : interview.startedAt ?? now).toISOString(),
    resuming: !wasInvited,
  };
}

/** One adaptive turn: persist the spoken answer, pick the next AI question. */
export async function advanceInterview(
  token: string,
  input: { transcript: string; durationSeconds: number; questionIndex: number }
): Promise<{
  speech: string;
  questionId: string;
  phase: string | null;
  questionIndex: number;
  questionCount: number;
  isComplete: boolean;
  error?: string;
}> {
  const interview = await getInterviewWithContext(token);
  if (!interview) throw new NotFoundError("Interview not found");
  if (interview.status === "COMPLETED") throw new ConflictError("Interview already completed");
  if (interview.status === "EXPIRED") throw new ConflictError("Interview link is no longer active");

  const roleConfig = await loadRoleConfig(getInternRoleKey(interview.application.job.title));
  const prepared = await prepareInterview(interview );

  const transcript = String(input.transcript ?? "").trim().slice(0, 6000);
  const startedMs = interview.startedAt?.getTime() ?? Date.now();
  const elapsedSec = Math.round((Date.now() - startedMs) / 1000);
  if (elapsedSec > (roleConfig?.maxDurationMinutes ?? 35) * 60) {
    // Time's up — force completion so nothing is lost.
    const closing =
      "Your time is up for this interview. Great effort — the interview is now being submitted for review.";
    return { speech: closing, questionId: `complete-${input.questionIndex}`, phase: "Complete", questionIndex: input.questionIndex, questionCount: interview.maxSteps, isComplete: true };
  }

  const statements = interview.messages.filter((m) => m.role === "ai");
  const lastAi = statements[statements.length - 1];
  const qa = buildQaFromMessages(interview.messages);
  const plan = getPlanFromInterview(interview.questions);
  const question = lastAi?.content
    ?? qa[qa.length - 1]?.question
    ?? plan[Math.max(0, input.questionIndex - 1)]?.question
    ?? "Tell me about yourself.";

  await prisma.aiInterviewMessage.create({
    data: { interviewId: interview.id, role: "candidate", content: transcript || "(no audible answer)" },
  });
  if (transcript) {
    await prisma.aiInterviewAnswer.create({
      data: {
        interviewId: interview.id,
        question,
        category: undefined,
        competency: undefined,
        transcript,
        durationSeconds: Math.max(0, input.durationSeconds),
        questionIndex: input.questionIndex,
      },
    });
  }

  const state: TurnState = {
    qa: [...qa, { question, answer: transcript }],
    currentPhase: interview.currentPhase,
    questionIndex: input.questionIndex,
    durationSeconds: elapsedSec,
  };

  if (!roleConfig) {
    return { speech: "Thank you. I have enough to complete this review. Submitting now.", questionId: `complete-${input.questionIndex}`, phase: "Complete", questionIndex: input.questionIndex, questionCount: interview.maxSteps, isComplete: true };
  }

  const turn = await nextAiTurn(roleConfig, prepared.cv, state, plan);

  await prisma.aiInterviewMessage.create({
    data: { interviewId: interview.id, role: "ai", content: turn.speech },
  });

  const updated = await prisma.aiInterview.update({
    where: { id: interview.id },
    data: {
      currentStep: Math.min(turn.questionIndex, interview.maxSteps),
      currentPhase: turn.phase,
      durationSeconds: elapsedSec,
      status: "IN_PROGRESS",
      startedAt: interview.startedAt ?? new Date(),
      durationMinutes: roleConfig.durationMinutes,
      maxSteps: roleConfig.maxQuestions,
    },
  });

  return {
    speech: turn.speech,
    questionId: plan[turn.questionIndex]?.questionId ?? `question-${turn.questionIndex + 1}`,
    phase: turn.phase,
    questionIndex: turn.questionIndex,
    questionCount: updated.maxSteps,
    isComplete: turn.isComplete,
  };
}

/** Finalize: evaluate, generate report, mark complete. */
export async function completeInterview(
  token: string
): Promise<{ status: string; completedAt: string; message: string }> {
  const interview = await getInterviewWithContext(token);
  if (!interview) throw new NotFoundError("Interview not found");
  if (interview.status === "COMPLETED") {
    return { status: "COMPLETED", completedAt: (interview.completedAt ?? new Date()).toISOString(), message: "Already completed" };
  }
  if (interview.status === "EXPIRED") throw new ConflictError("Interview link is no longer active");

  const roleConfig = await loadRoleConfig(getInternRoleKey(interview.application.job.title));
  const prepared = await prepareInterview(interview );

  const qa = buildQaFromMessages(interview.messages);
  const integrity = await integritySummary(interview.id);
  const durations = (await prisma.aiInterviewAnswer.findMany({
    where: { interviewId: interview.id },
    select: { durationSeconds: true },
  })).map((d) => d.durationSeconds);

  let score: number | null = null;
  let summary = "";
  let strengths: string[] = [];
  let concerns: string[] = [];
  let categoryScores: Record<string, number> = {};
  let recommendation: string | null = null;
  let report: Record<string, unknown> | null = null;

  if (roleConfig) {
    const evaluation = await evaluateInterview(
      roleConfig,
      prepared.cv,
      qa,
      integrity,
      durations,
      prepared.cvText
    );
    score = evaluation.overall;
    summary = evaluation.summary;
    strengths = evaluation.strengths;
    concerns = evaluation.improvements;
    categoryScores = evaluation.categoryScores;
    recommendation = evaluation.recommendation;
    report = {
      overall: evaluation.overall,
      categoryScores: evaluation.categoryScores,
      recommendation: evaluation.recommendation,
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      summary: evaluation.summary,
      answerCount: qa.length,
      durationMinutes: Math.round(interview.durationSeconds ?? 0) / 60,
      integrity,
    };
  }

  const completedAt = new Date();
  const data: Prisma.AiInterviewUpdateInput = {
    status: "COMPLETED",
    completedAt,
    score,
    summary,
    verdict: null,
    strengths,
    concerns,
    categoryScores: categoryScores as unknown as Prisma.InputJsonValue,
    recommendation,
    report: report as unknown as Prisma.InputJsonValue,
    durationSeconds: interview.durationSeconds ?? Math.round((completedAt.getTime() - (interview.startedAt?.getTime() ?? completedAt.getTime())) / 1000),
  };
  await prisma.aiInterview.update({ where: { id: interview.id }, data });

  return {
    status: "COMPLETED",
    completedAt: completedAt.toISOString(),
    message:
      "Your interview has been submitted for review. Shortlisting and rejection are decided by our admin team only — expect the verdict within 24-48 hours.",
  };
}

export function buildQaFromMessages(messages: { role: string; content: string; createdAt: Date }[]): { question: string; answer: string }[] {
  const qa: { question: string; answer: string }[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "ai") {
      const question = messages[i].content;
      const answer = messages[i + 1]?.role === "candidate" ? messages[i + 1].content : "";
      if (question) qa.push({ question, answer });
    }
  }
  return qa.filter((q) => q.question.length > 0);
}

export async function integritySummary(interviewId: string): Promise<IntegritySummary> {
  const events = await prisma.integrityEvent.findMany({ where: { interviewId } });
  const s: IntegritySummary = { ...emptyIntegrity };
  for (const e of events) {
    if (e.eventType === "tab_switch") s.tabSwitches += 1;
    else if (e.eventType === "blur") s.blurCount += 1;
    else if (e.eventType === "camera_disconnected") s.cameraDisconnects += 1;
    else if (e.eventType === "mic_disconnected") s.micDisconnects += 1;
    else if (e.eventType === "candidate_not_visible") s.candidateNotVisible += 1;
    else if (e.eventType === "refresh") s.refreshCount += 1;
    else if (e.eventType === "multi_face") s.multiFace += 1;
    else if (e.eventType === "interruption") s.interruptions += 1;
  }
  return s;
}

export class NotFoundError extends Error {}
export class ConflictError extends Error {}
export class ValidationError extends Error {}

export { parseCV };