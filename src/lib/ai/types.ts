export interface CvStructured {
  name?: string;
  email?: string;
  phone?: string;
  education?: { degree?: string; field?: string; institution?: string; graduationYear?: number }[];
  skills?: string[];
  technologies?: string[];
  experience?: { role?: string; company?: string; period?: string; description?: string }[];
  internships?: string[];
  projects?: { name?: string; description?: string; link?: string }[];
  certifications?: { name?: string; issuer?: string }[];
  achievements?: string[];
}

export interface QuestionPlanItem {
  questionId?: string;
  question: string;
  category: string;
  difficulty: "basic" | "medium" | "advanced";
  competency: string;
  maxScore: number;
}

export interface InterviewQa {
  question: string;
  answer: string;
}

export type Recommendation =
  | "STRONG_CONSIDERATION"
  | "CONSIDER"
  | "NEEDS_REVIEW"
  | "NOT_RECOMMENDED";

export interface InterviewReport {
  categoryScores: Record<string, number>;
  overall: number;
  recommendation: Recommendation;
  strengths: string[];
  improvements: string[];
  summary: string;
}

export interface AiTurnResult {
  speech: string;
  phase: string | null;
  questionIndex: number;
  isComplete: boolean;
}

export interface IntegritySummary {
  tabSwitches: number;
  blurCount: number;
  cameraDisconnects: number;
  micDisconnects: number;
  candidateNotVisible: number;
  refreshCount: number;
  multiFace: number;
  interruptions: number;
}

export const emptyCv: CvStructured = {
  name: undefined,
  email: undefined,
  phone: undefined,
  education: [],
  skills: [],
  technologies: [],
  experience: [],
  internships: [],
  projects: [],
  certifications: [],
  achievements: [],
};

export const emptyIntegrity: IntegritySummary = {
  tabSwitches: 0,
  blurCount: 0,
  cameraDisconnects: 0,
  micDisconnects: 0,
  candidateNotVisible: 0,
  refreshCount: 0,
  multiFace: 0,
  interruptions: 0,
};