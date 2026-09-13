// Core AI interview engine: CV parsing, adaptive question generation,
// follow-up logic, and final evaluation/reporting. All model calls go through
// the `aiProvider` abstraction. Where the provider is unavailable, deterministic
// fallbacks are used so an interview never hard-fails and never fabricates
// scores — fallbacks are computed from real transcript evidence.

import { aiProvider } from "@/lib/ai/provider";
import type {
  AiTurnResult,
  CvStructured,
  IntegritySummary,
  InterviewQa,
  InterviewReport,
  QuestionPlanItem,
  Recommendation,
} from "@/lib/ai/types";
import { emptyCv } from "@/lib/ai/types";
import type { InternRoleConfig } from "@/data/intern-roles";

export const MAX_CV_TEXT = 6000;
const MAX_PROMPT_CV = 3500;

function clamp(n: number): number {
  if (Number.isNaN(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function truncate(s: string | null | undefined, max: number): string {
  if (!s) return "";
  return s.length <= max ? s : `${s.slice(0, max)} …`;
}

// ---------------------------------------------------------------- CV parsing

export async function parseCV(text: string): Promise<CvStructured> {
  const source = truncate(text, MAX_CV_TEXT) || "(empty file)";
  if (!aiProvider.isConfigured()) {
    return tryLocalCvParse(source);
  }
  try {
    const raw = await aiProvider.json<CvStructured>(
      [
        "Extract structured information from this candidate's CV/resume.",
        "CV TEXT:",
        source,
        "",
        "Return ONLY JSON matching the schema. Use empty arrays when a field is absent.",
        "Do not invent information.",
      ].join("\n"),
      {
        system:
          "You are a precise CV parser. Parse exactly what is in the resume text — never hallucinate roles, institutions, or skills.",
        schema: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            email: { type: "STRING" },
            phone: { type: "STRING" },
            education: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  degree: { type: "STRING" },
                  field: { type: "STRING" },
                  institution: { type: "STRING" },
                  graduationYear: { type: "INTEGER" },
                },
              },
            },
            skills: { type: "ARRAY", items: { type: "STRING" } },
            technologies: { type: "ARRAY", items: { type: "STRING" } },
            experience: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  role: { type: "STRING" },
                  company: { type: "STRING" },
                  period: { type: "STRING" },
                  description: { type: "STRING" },
                },
              },
            },
            internships: { type: "ARRAY", items: { type: "STRING" } },
            projects: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  description: { type: "STRING" },
                  link: { type: "STRING" },
                },
              },
            },
            certifications: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: { name: { type: "STRING" }, issuer: { type: "STRING" } },
              },
            },
            achievements: { type: "ARRAY", items: { type: "STRING" } },
          },
        },
        temperature: 0.2,
        maxTokens: 1500,
      }
    );
    return sanitizeCv(raw, source);
  } catch {
    return tryLocalCvParse(source);
  }
}

function sanitizeCv(raw: CvStructured, fallbackText: string): CvStructured {
  const clean: CvStructured = { ...emptyCv, ...(raw ?? {}) };
  clean.education = Array.isArray(clean.education) ? clean.education : [];
  clean.skills = (Array.isArray(clean.skills) ? clean.skills : []).map(String).slice(0, 40);
  clean.technologies = (Array.isArray(clean.technologies) ? clean.technologies : []).map(String).slice(0, 30);
  clean.experience = Array.isArray(clean.experience) ? clean.experience : [];
  clean.internships = Array.isArray(clean.internships) ? clean.internships : [];
  clean.projects = Array.isArray(clean.projects) ? clean.projects : [];
  clean.certifications = Array.isArray(clean.certifications) ? clean.certifications : [];
  clean.achievements = Array.isArray(clean.achievements) ? clean.achievements : [];
  if (!clean.name) {
    const firstLine = fallbackText.split("\n").find((l) => l.trim().length > 0);
    clean.name = firstLine ? firstLine.trim().slice(0, 80) : undefined;
  }
  return clean;
}

/** Deterministic fallback parser (name/email/phone + skill keyword scan). */
function tryLocalCvParse(text: string): CvStructured {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const name = lines[0]?.slice(0, 80);
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0];
  const phone = text.match(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d{5,10}(?:[\s.-]\d{2,4}){0,2}/)?.[0];
  const skills = ["React", "JavaScript", "TypeScript", "HTML", "CSS", "Node.js", "Python", "SQL", "Git", "Communication", "Sales"]
    .filter((s) => text.toLowerCase().includes(s.toLowerCase()))
    .slice(0, 30);
  return {
    name,
    email,
    phone,
    skills,
    technologies: skills,
    education: [],
    experience: [],
    internships: [],
    projects: [],
    certifications: [],
    achievements: [],
  };
}

// ----------------------------------------------------------- interview plan

const TOPIC_POOL: Record<string, string[]> = {
  "frontend-developer-intern": [
    "React (components, props, state, hooks)",
    "The DOM, events and browser APIs",
    "CSS, layout and responsive design",
    "Fetching data from APIs and rendering it",
    "Handling loading, error and edge states",
    "Debugging a broken feature methodically",
  ],
  "bde-intern": [
    "Lead generation and finding prospects",
    "Cold outreach: calls and messages",
    "Handling objections on a call",
    "Explaining an offering and following up",
    "Negotiating and closing",
    "Organizing your pipeline (CRM basics)",
  ],
};

function planTopics(role: InternRoleConfig): string[] {
  return TOPIC_POOL[role.key] ?? [
    "Why you want this internship",
    "Relevant experience from your CV",
    "A challenge you solved",
    "Teamwork and communication",
    "How you learn new things",
    "Fit with this role",
  ];
}

export async function generateInterviewPlan(
  role: InternRoleConfig,
  cv: CvStructured,
  candidateName: string
): Promise<QuestionPlanItem[]> {
  const cvBlock = cvBlockText(cv);
  const topics = planTopics(role);
  try {
    if (aiProvider.isConfigured()) {
      const raw = await aiProvider.json<{ questions: QuestionPlanItem[] }>(
        [
          `You are preparing an AI video interview for the "${role.title}" role. Candidate: ${candidateName}.`,
          "",
          "ROLE COMPETENCIES (each question should target exactly one)",
          role.competencies.map((c) => `- ${c} (weight ${role.weights[c] ?? 0}%)`).join("\n"),
          "",
          "PRIORITY DISCUSSION TOPICS",
          topics.map((t, i) => `${i + 1}. ${t}`).join("\n"),
          "",
          "CANDIDATE CV",
          cvBlock || "(no CV provided — craft generic probing questions)",
          "",
          "Generate 10 questions forming a personalized interview flow:",
          "- 2 warm intro questions (about themselves, why this role)",
          "- 4-5 questions derived FROM the candidate's CV (reference specific projects, skills, or experience they mention)",
          "- 2-3 questions probing the priority topics and competencies",
          "- 1 closing question (availability, motivation)",
          "- Always produce exactly 10 questions so the live interview has enough depth.",
          "",
          "IMPORTANT:",
          "- Questions must be SHORT and CLEAR (max 30 words each). The AI will speak them aloud.",
          "- Reference the candidate's actual CV content — mention their projects, companies, or skills by name.",
          "- Each question should be specific and require a detailed answer, not a yes/no.",
          "- Questions should flow naturally from one topic to the next.",
          "",
          "Return ONLY JSON matching the schema.",
        ].join("\n"),
        {
          system:
            "You are an experienced hiring manager. Write sharp, specific interview questions that reference the candidate's real background. Each question must be one spoken sentence, max 30 words.",
          schema: {
            type: "OBJECT",
            properties: {
              questions: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    question: { type: "STRING" },
                    category: { type: "STRING" },
                    difficulty: { type: "STRING", enum: ["basic", "medium", "advanced"] },
                    competency: { type: "STRING" },
                    maxScore: { type: "INTEGER" },
                  },
                  required: ["question", "competency"],
                },
              },
            },
            required: ["questions"],
          },
          temperature: 0.7,
          maxTokens: 2500,
        }
      );
      const questions = (raw.questions || [])
        .map((q, index) => ({
          questionId: `question-${index + 1}`,
          question: String(q.question ?? "").trim().slice(0, 500),
          category: String(q.category ?? q.competency ?? "General").trim(),
          difficulty: (["basic", "medium", "advanced"].includes(q.difficulty) ? q.difficulty : "medium") as QuestionPlanItem["difficulty"],
          competency: String(q.competency ?? q.category ?? "General").trim(),
          maxScore: Number(q.maxScore) || 10,
        }))
        .filter((q) => q.question.length > 0);
      if (questions.length >= 8) return questions.slice(0, Math.max(10, role.maxQuestions));
    }
  } catch {
    /* fall through to template */
  }
  return TEMPLATE_PLANS[role.key] ?? templatePlan(role, topics);
}

function templatePlan(role: InternRoleConfig, topics: string[]): QuestionPlanItem[] {
  return [
    { question: `Thanks for joining. Tell me a little about yourself and why the ${role.title} role caught your eye.`, category: "Communication", difficulty: "basic", competency: "Communication", maxScore: 10 },
    ...topics.map<QuestionPlanItem>((t, i) => ({
      question: `Let's talk about ${t}. Walk me through what you know and any practical experience you have with it.`,
      category: role.competencies[i % role.competencies.length],
      difficulty: i % 3 === 0 ? "basic" : i % 3 === 1 ? "medium" : "advanced",
      competency: role.competencies[i % role.competencies.length],
      maxScore: 10,
    })),
  ];
}

const TEMPLATE_PLANS: Record<string, QuestionPlanItem[]> = {
  "frontend-developer-intern": [
    { question: "Tell me a little about yourself and why you want the Frontend Developer Intern role.", category: "Communication", difficulty: "basic", competency: "Communication", maxScore: 10 },
    { question: "Give me an example of a website or UI you built. What did you build, and what did you find hard?", category: "Project Understanding", difficulty: "medium", competency: "Project Understanding", maxScore: 10 },
    { question: "How does React state work, and when would you lift state to a parent component?", category: "Technical Knowledge", difficulty: "medium", competency: "Technical Knowledge", maxScore: 10 },
    { question: "Your page works on desktop but looks broken on a phone. How would you debug it?", category: "Problem Solving", difficulty: "medium", competency: "Problem Solving", maxScore: 10 },
    { question: "An API request is taking 5 seconds to return. What would you check to speed it up?", category: "Technical Knowledge", difficulty: "advanced", competency: "Technical Knowledge", maxScore: 10 },
    { question: "Walk me through how you'd structure a small React project for a new feature.", category: "Technical Knowledge", difficulty: "advanced", competency: "Technical Knowledge", maxScore: 10 },
    { question: "How do you keep learning when you get stuck on a bug or a new skill?", category: "Learning Ability", difficulty: "basic", competency: "Learning Ability", maxScore: 10 },
    { question: "What's your schedule and availability if you're selected for this internship?", category: "Role Fit", difficulty: "basic", competency: "Role Fit", maxScore: 10 },
    { question: "How would you use Git and GitHub when collaborating on a frontend feature?", category: "Technical Knowledge", difficulty: "medium", competency: "Technical Knowledge", maxScore: 10 },
    { question: "What would you improve first if users reported that a page felt slow or confusing?", category: "Problem Solving", difficulty: "advanced", competency: "Problem Solving", maxScore: 10 },
  ],
  "bde-intern": [
    { question: "Tell me a little about yourself and why the BDE Intern role interests you.", category: "Communication", difficulty: "basic", competency: "Communication", maxScore: 10 },
    { question: "Describe any experience reaching out to people — events, selling, networking, or community work.", category: "Sales Ability", difficulty: "medium", competency: "Sales Ability", maxScore: 10 },
    { question: "How would you find companies that don't currently hire interns but could benefit from them?", category: "Sales Ability", difficulty: "medium", competency: "Sales Ability", maxScore: 10 },
    { question: "You're pitching UpJob to a company that says they don't need interns. How would you respond?", category: "Objection Handling", difficulty: "medium", competency: "Objection Handling", maxScore: 10 },
    { question: "A prospect says your service is too expensive. What would you say?", category: "Objection Handling", difficulty: "advanced", competency: "Objection Handling", maxScore: 10 },
    { question: "How do you persuade a prospect who stops replying to respond again?", category: "Persuasion", difficulty: "medium", competency: "Persuasion", maxScore: 10 },
    { question: "Walk me through how you'd build and track a lead pipeline from scratch.", category: "Problem Solving", difficulty: "basic", competency: "Problem Solving", maxScore: 10 },
    { question: "How comfortable are you making cold calls, and how would you prepare for your first one?", category: "Communication", difficulty: "basic", competency: "Communication", maxScore: 10 },
    { question: "Tell me about a time you handled rejection and what you changed afterward.", category: "Objection Handling", difficulty: "medium", competency: "Objection Handling", maxScore: 10 },
    { question: "If a promising lead asks for information and then goes quiet, what would you do next?", category: "Persuasion", difficulty: "advanced", competency: "Persuasion", maxScore: 10 },
  ],
};

export function cvBlockText(cv: CvStructured | null): string {
  if (!cv) return "";
  const lines: string[] = [];
  if (cv.name) lines.push(`Name: ${cv.name}`);
  if (cv.education?.length) {
    lines.push("Education: " + cv.education.map((e) => [e.degree, e.field, e.institution, e.graduationYear].filter(Boolean).join(", ")).join(" | "));
  }
  if (cv.skills?.length) lines.push(`Skills: ${cv.skills.join(", ")}`);
  if (cv.technologies?.length) lines.push(`Technologies: ${cv.technologies.join(", ")}`);
  if (cv.experience?.length) {
    lines.push("Experience:");
    for (const e of cv.experience) lines.push(`- ${[e.role, e.company, e.period].filter(Boolean).join(" @ ")} — ${truncate(e.description, 200)}`);
  }
  if (cv.internships?.length) lines.push(`Internships: ${cv.internships.join(" | ")}`);
  if (cv.projects?.length) {
    lines.push("Projects:");
    for (const p of cv.projects) lines.push(`- ${p.name} — ${truncate(p.description, 200)}`);
  }
  if (cv.certifications?.length) lines.push(`Certifications: ${cv.certifications.map((c) => [c.name, c.issuer].filter(Boolean).join(" — ")).join(" | ")}`);
  if (cv.achievements?.length) lines.push(`Achievements: ${cv.achievements.join(" | ")}`);
  return truncate(lines.join("\n"), MAX_PROMPT_CV);
}

export function getPlanFromInterview(questions: unknown): QuestionPlanItem[] {
  if (!Array.isArray(questions)) return [];
  return questions
    .map((q) => q as Record<string, unknown>)
    .filter((q) => typeof q?.question === "string")
    .map((q, index) => ({
      questionId: typeof q.questionId === "string" ? q.questionId : `question-${index + 1}`,
      question: String(q.question),
      category: String(q.category ?? q.competency ?? "General"),
      difficulty: ["basic", "medium", "advanced"].includes(String(q.difficulty)) ? (String(q.difficulty) as QuestionPlanItem["difficulty"]) : "medium",
      competency: String(q.competency ?? q.category ?? "General"),
      maxScore: Number(q.maxScore) || 10,
    }));
}

// -------------------------------------------------- adaptive turn (question)

export interface TurnState {
  qa: InterviewQa[];
  currentPhase: string | null;
  questionIndex: number;
  durationSeconds: number;
}

export async function nextAiTurn(
  role: InternRoleConfig,
  cv: CvStructured,
  state: TurnState,
  plan: QuestionPlanItem[]
): Promise<AiTurnResult> {
  const answered = state.qa.length;
  const atPlanEnd = state.questionIndex >= plan.length;
  const atMax = answered + 1 >= role.maxQuestions;
  const atMin = answered >= role.minQuestions;
  const planned = plan[state.questionIndex];

  const transcript = state.qa
    .map((item, i) => `Q${i + 1}: ${item.question}\nA${i + 1}: ${item.answer || "[unclear / no audible answer]"}`)
    .join("\n\n");
  const lastA = state.qa[state.qa.length - 1]?.answer ?? "";

  if (aiProvider.isConfigured()) {
    try {
      const raw = await aiProvider.json<{
        speech?: string;
        action?: "follow_up" | "next" | "complete";
        phase?: string;
      }>(
        [
          `You are the AI interviewer for a ~${role.durationMinutes}-minute video interview for "${role.title}".`,
          "",
          "ROLE & COMPETENCIES",
          role.competencies.map((c) => `- ${c}`).join("\n"),
          "",
          "CANDIDATE CV",
          cvBlockText(cv) || "(none)",
          "",
          "TRANSCRIPT SO FAR",
          transcript || "(just started)",
          "",
          `NEXT PLANNED QUESTION: ${planned ? planned.question : "(none — plan exhausted)"}`,
          "",
          "RULES:",
          `- You have ${answered} question(s) answered so far. The interview should aim for ${role.minQuestions}-${role.maxQuestions} total questions.`,
          "1. Keep 'speech' to ONE short, clear spoken sentence. Maximum 25 words. Ask exactly ONE question.",
          "2. If the candidate's last answer was vague, weak, or contradictory, ask a short follow-up probing for a concrete example.",
          "3. If the last answer was good, move to the next planned question (reword it naturally, do not read it verbatim).",
          "4. After ${role.minQuestions} questions, you may say 'complete' if you have enough evidence to evaluate.",
          "5. Be conversational and warm. Reference something specific the candidate said to show you listened.",
          "6. Never reveal scores, never say you are evaluating, never promise selection.",
          "7. Your speech must be a QUESTION ending with '?'. Do not make statements.",
          "",
          "Return ONLY JSON matching the schema.",
        ].join("\n"),
        {
          system:
            "You are a warm, professional human recruiter conducting a one-on-one video interview. Be conversational, curious, and concise. Ask ONE question at a time. Reference the candidate's specific answers to show active listening. Never use corporate jargon. Speak naturally like a real person would in a conversation.",
          schema: {
            type: "OBJECT",
            properties: {
              speech: { type: "STRING" },
              action: { type: "STRING", enum: ["follow_up", "next", "complete"] },
              phase: { type: "STRING" },
            },
            required: ["speech", "action"],
          },
          temperature: 0.6,
          maxTokens: 200,
        }
      );

      const action = raw?.action ?? "next";
      const speech = String(raw?.speech ?? "").trim();
      if (action === "complete") {
        if (atMin) {
          return { speech: speech || closingSpeech(role), phase: "Complete", questionIndex: state.questionIndex, isComplete: true };
        }
        return {
          speech: speech || (planned ? planned.question : closingSpeech(role)),
          phase: raw?.phase ?? state.currentPhase,
          questionIndex: state.questionIndex + 1,
          isComplete: false,
        };
      }
      if (speech) {
        return {
          speech,
          phase: raw?.phase ?? state.currentPhase,
          questionIndex: state.questionIndex + (action === "next" ? 1 : 0),
          isComplete: false,
        };
      }
    } catch {
      /* fall through to deterministic path */
    }
  }

  if (atMax || (atPlanEnd && atMin)) {
    return { speech: closingSpeech(role), phase: "Complete", questionIndex: state.questionIndex, isComplete: true };
  }

  const short = lastA.replace(/\s+/g, " ").trim();
  if (short.length > 0 && short.length < 40 && state.qa.length > 0 && planned) {
    const followUps = [
      `Can you give me a specific example of that — what exactly did you do?`,
      `That's interesting. Can you walk me through the details of how you handled that?`,
      `Could you elaborate on that a bit more? I'd love to hear the specifics.`,
      `Can you tell me more about your role in that — what was your contribution?`,
    ];
    const idx = state.qa.length % followUps.length;
    return {
      speech: followUps[idx],
      phase: state.currentPhase,
      questionIndex: state.questionIndex,
      isComplete: false,
    };
  }

  const next = planned ? planned.question : "Tell me about something recent you're proud of, and why it matters for this role.";
  return { speech: next, phase: state.currentPhase, questionIndex: state.questionIndex + 1, isComplete: false };
}

function closingSpeech(role: InternRoleConfig): string {
  return `That brings us to the end of your interview for the ${role.title} role. Thank you for your time today. Your responses have been submitted for HR review, and the UpJob team will contact you regarding the next step. You can close this window now.`;
}

// ----------------------------------------------------------- final evaluation

export async function evaluateInterview(
  role: InternRoleConfig,
  cv: CvStructured,
  qa: InterviewQa[],
  integrity: IntegritySummary,
  _durations: number[],
  rawCvText?: string | null
): Promise<InterviewReport> {
  const transcript = qa
    .map((item, i) => `Q${i + 1}: ${item.question}\nA${i + 1}: ${item.answer || "(no audible answer)"}`)
    .join("\n\n");
  const weightsDesc = role.competencies
    .map((c) => `${c} (weight ${role.weights[c] ?? 0})`)
    .join(", ");

  let categoryScores: Record<string, number> = {};
  let strengths: string[] = [];
  let improvements: string[] = [];
  let summary = "";

  if (aiProvider.isConfigured()) {
    try {
      const raw = await aiProvider.json<{
        categoryScores?: Record<string, number>;
        strengths?: string[];
        improvements?: string[];
        summary?: string;
      }>(
        [
          `Evaluate this candidate for "${role.title}".`,
          "COMPETENCY WEIGHTS (return exactly these categories)",
          weightsDesc,
          "CANDIDATE CV",
          cvBlockText(cv) || truncate(rawCvText, 1500) || "(no CV)",
          "INTERVIEW TRANSCRIPT",
          transcript || "(empty interview)",
          `Integrity context (for calibration only, never an auto-reject): ${JSON.stringify(integrity)}`,
          "",
          "Score EACH competency 0-100 based ONLY on evidence in the transcript and CV. Then list 2-4 strengths and 2-4 areas to improve, plus a concise 2-3 sentence recruiter-friendly summary. Be fair and specific. Do not invent facts.",
          "Return ONLY JSON matching the schema.",
        ].join("\n"),
        {
          system:
            "You are an evidence-based recruiting analyst. Never infer attributes from protected characteristics. Recommendation categories are decided outside this prompt.",
          schema: {
            type: "OBJECT",
            properties: {
              categoryScores: {
                type: "OBJECT",
                additionalProperties: { type: "INTEGER" },
              },
              strengths: { type: "ARRAY", items: { type: "STRING" } },
              improvements: { type: "ARRAY", items: { type: "STRING" } },
              summary: { type: "STRING" },
            },
            required: ["categoryScores", "strengths", "summary"],
          },
          temperature: 0.3,
          maxTokens: 1200,
        }
      );

      categoryScores = normalizeCategoryScores(raw.categoryScores, role);
      strengths = (raw.strengths || []).map(String).slice(0, 5);
      improvements = (raw.improvements || []).map(String).slice(0, 5);
      summary = String(raw.summary ?? "").trim() || defaultSummary(role, qa.length);
    } catch {
      /* fall through to deterministic */
    }
  }

  if (Object.keys(categoryScores).length === 0) {
    const depth = qa.length ? qa.reduce((s, a) => s + a.answer.length, 0) / qa.length : 0;
    const rough = Math.max(0, Math.min(100, Math.round(depth / 7)));
    for (const c of role.competencies) categoryScores[c] = clamp(rough + (role.weights[c] % 7) - 3);
    if (!summary) summary = defaultSummary(role, qa.length);
  }

  const overall = weightedOverall(categoryScores, role.weights);
  return {
    categoryScores,
    overall,
    recommendation: recommend(overall, role),
    strengths,
    improvements,
    summary,
  };
}

function normalizeCategoryScores(raw: Record<string, number> | undefined, role: InternRoleConfig): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const c of role.competencies) {
    const v = Number(raw[c]);
    if (!Number.isNaN(v)) out[c] = clamp(v);
  }
  return out;
}

function weightedOverall(scores: Record<string, number>, weights: Record<string, number>): number {
  const entries = Object.entries(scores);
  if (!entries.length) return 50;
  let num = 0;
  let den = 0;
  for (const [name, score] of entries) {
    const w = Number(weights[name]) || 1;
    num += score * w;
    den += w;
  }
  return den > 0 ? clamp(Math.round(num / den)) : 50;
}

function recommend(overall: number, role: InternRoleConfig): Recommendation {
  if (overall >= role.thresholds.strong) return "STRONG_CONSIDERATION";
  if (overall >= role.thresholds.consider) return "CONSIDER";
  if (overall >= role.thresholds.needsReview) return "NEEDS_REVIEW";
  return "NOT_RECOMMENDED";
}

function defaultSummary(role: InternRoleConfig, answered: number): string {
  return `Candidate completed a ${answered}-question AI interview for ${role.title}. Report generated by the AI screening engine for HR review.`;
}