// UpJob AI video-interview intern roles. These two roles drive the automated
// ~30-minute adaptive video interview. Weights/thresholds are configurable via
// the admin panel (InterviewConfig rows) — see src/lib/ai/config.ts.

export interface InternRoleConfig {
  key: string;
  title: string;
  category: string;
  location: string;
  workMode: string;
  stipend: string;
  tagline: string;
  shortDescription: string;
  requiredSkills: string[];
  description: string;
  requirements: string[];
  benefits: string[];
  phases: string[];
  competencies: string[];
  weights: Record<string, number>;
  durationMinutes: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  maxQuestions: number;
  minQuestions: number;
  difficulty: string;
  thresholds: { strong: number; consider: number; needsReview: number };
  recordingEnabled: boolean;
  showScoreToCandidate: boolean;
  retryAllowed: boolean;
  interviewerIntro: string;
}

export const INTERN_ROLES: InternRoleConfig[] = [
  {
    key: "frontend-developer-intern",
    title: "Frontend Developer Intern",
    category: "INTERNSHIP",
    location: "Remote",
    workMode: "REMOTE",
    stipend: "₹10,000/month",
    tagline: "Intern Today. Get Hired Tomorrow.",
    shortDescription:
      "Build real products with React, analyze your CV with our AI interviewer, and get hired based on evidence — not bias.",
    requiredSkills: ["HTML", "CSS", "JavaScript", "React", "Git/GitHub", "Responsive Design"],
    description:
      "Join UpJob as a Frontend Developer Intern. You will own UI features end-to-end, work closely with design and product, and learn shipping-fast practices in a startup environment.",
    requirements: [
      "Good grasp of HTML, CSS and modern JavaScript (ES6+)",
      "Comfortable with React (components, props, state)",
      "Understands the DOM, APIs and basic responsive design",
      "Eager to learn, debug methodically and communicate clearly",
    ],
    benefits: ["Stipend", "Certificate of Internship", "Mentorship", "Pre-placement offer for top performers"],
    phases: ["Introduction", "CV Discussion", "Technical Knowledge", "Project Deep Dive", "Practical Scenario", "Final Questions", "Complete"],
    competencies: [
      "Technical Knowledge",
      "Problem Solving",
      "Project Understanding",
      "Communication",
      "Learning Ability",
      "Role Fit",
    ],
    weights: {
      "Technical Knowledge": 25,
      "Problem Solving": 20,
      "Project Understanding": 20,
      "Communication": 15,
      "Learning Ability": 10,
      "Role Fit": 10,
    },
    durationMinutes: 15,
    minDurationMinutes: 8,
    maxDurationMinutes: 22,
    maxQuestions: 10,
    minQuestions: 8,
    difficulty: "adaptive",
    thresholds: { strong: 80, consider: 65, needsReview: 50 },
    recordingEnabled: false,
    showScoreToCandidate: false,
    retryAllowed: false,
    interviewerIntro:
      "Hi {name}, welcome to your UpJob AI interview for the Frontend Developer Intern role. I'll be asking you a few questions based on your background, your CV and the skills this internship needs. Answer naturally — there are no right or wrong prepared answers. Let's begin.",
  },
  {
    key: "bde-intern",
    title: "Business Development Executive Intern",
    category: "INTERNSHIP",
    location: "Remote",
    workMode: "REMOTE",
    stipend: "₹10,000/month",
    tagline: "Intern Today. Get Hired Tomorrow.",
    shortDescription:
      "Learn sales, lead generation and client communication from scratch. Our AI interviewer assesses real-world sales thinking.",
    requiredSkills: ["Communication", "Lead Generation", "Cold Calling", "Negotiation", "CRM Basics"],
    description:
      "Join UpJob as a Business Development Executive Intern. You will generate leads, run discovery calls, handle objections and help UpJob sign up companies and partners.",
    requirements: [
      "Clear, confident communication in English",
      "Interest in sales, outreach and client relationships",
      "Comfortable with cold calls/messages and follow-up discipline",
      "Basic working knowledge of spreadsheets or simple CRMs (a plus)",
    ],
    benefits: ["Stipend", "Certificate of Internship", "Sales mentorship", "Incentives on closed deals"],
    phases: ["Introduction", "CV Discussion", "Communication & Sales", "Objection Handling", "Scenario Questions", "Final Questions", "Complete"],
    competencies: [
      "Communication",
      "Sales Ability",
      "Problem Solving",
      "Persuasion",
      "Objection Handling",
      "Role Fit",
    ],
    weights: {
      "Communication": 25,
      "Sales Ability": 20,
      "Problem Solving": 15,
      "Persuasion": 15,
      "Objection Handling": 15,
      "Role Fit": 10,
    },
    durationMinutes: 15,
    minDurationMinutes: 8,
    maxDurationMinutes: 22,
    maxQuestions: 10,
    minQuestions: 8,
    difficulty: "adaptive",
    thresholds: { strong: 80, consider: 65, needsReview: 50 },
    recordingEnabled: false,
    showScoreToCandidate: false,
    retryAllowed: false,
    interviewerIntro:
      "Hi {name}, welcome to your UpJob AI interview for the Business Development Executive Intern role. I want to understand how you think about conversations, objections and closing — so I'll ask a few questions and follow up on your answers. Let's begin.",
  },
];

export function detectInternRole(title: string): InternRoleConfig | null {
  const t = title.toLowerCase();
  for (const role of INTERN_ROLES) {
    const haystack = `${role.key} ${role.title}`.toLowerCase();
    if (haystack.includes(t) || t.includes(role.key) || (t.includes("frontend") && role.key.startsWith("frontend")) || (t.includes("business development") && role.key.startsWith("bde"))) {
      return role;
    }
  }
  return null;
}