import "dotenv/config";
import { PrismaClient, Role, JobType, JobStatus, WorkMode } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { buildSeedCompanies, buildSeedJobs } from "./seed-data.mjs";

const TYPE_ENUM = { INTERNSHIP: JobType.INTERNSHIP, FULL_TIME: JobType.FULL_TIME, PART_TIME: JobType.PART_TIME, CONTRACT: JobType.CONTRACT };
const WORKMODE_ENUM = { REMOTE: WorkMode.REMOTE, HYBRID: WorkMode.HYBRID, ON_SITE: WorkMode.ON_SITE };

// FoloUp-style interviewer personas that host the AI interviews.
const INTERVIEWERS = [
  {
    key: "maya-warm",
    name: "Maya",
    description: "Warm, patient and encouraging — puts candidates at ease and draws out their best stories.",
    image: null,
    empathy: 90,
    exploration: 70,
    rapport: 85,
    speed: 40,
    voiceHint: "en-IN",
  },
  {
    key: "rohan-thorough",
    name: "Rohan",
    description: "Structured and methodical — digs deep with follow-up questions and precise scoring.",
    image: null,
    empathy: 60,
    exploration: 90,
    rapport: 70,
    speed: 50,
    voiceHint: "en-IN",
  },
  {
    key: "elena-energy",
    name: "Elena",
    description: "Energetic and fast-paced — keeps the conversation moving and covers more ground.",
    image: null,
    empathy: 70,
    exploration: 70,
    rapport: 75,
    speed: 85,
    voiceHint: "en-US",
  },
  {
    key: "dev-analytical",
    name: "Dev",
    description: "Analytical and direct — focuses on technical depth and rigorous problem solving.",
    image: null,
    empathy: 45,
    exploration: 85,
    rapport: 55,
    speed: 65,
    voiceHint: "en-IN",
  },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const email = (process.env.ADMIN_EMAIL || "admin@upjob.app").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin#2026";

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: Role.ADMIN, passwordHash, emailVerified: true },
    create: {
      email,
      name: "UpJob Admin",
      passwordHash,
      role: Role.ADMIN,
      emailVerified: true,
    },
  });

  console.log(`[seed] Admin ready: ${admin.email}`);
  await seedCompanies(prisma, admin.id);
  await seedInternJobs(prisma, admin.id);
  await seedInterviewers(prisma);
  await prisma.$disconnect();
}

async function seedCompanies(prisma, adminId) {
  const seedCompanies = buildSeedCompanies();

  for (const c of seedCompanies) {
    await prisma.company.upsert({
      where: { slug: c.slug },
      update: {
        industry: c.industry,
        location: c.location,
        companySize: c.companySize,
        description: c.description,
        website: c.website,
        founded: c.founded,
        headquarters: c.headquarters,
        isPartner: c.isPartner,
        isVerified: c.isFeatured,
        isFeatured: c.isFeatured,
      },
      create: {
        name: c.name,
        slug: c.slug,
        logo: c.name === "UpJob" ? "/upjob-mark.svg" : null,
        industry: c.industry,
        location: c.location,
        companySize: c.companySize,
        description: c.description,
        website: c.website,
        founded: c.founded,
        headquarters: c.headquarters,
        isPartner: c.isPartner,
        isVerified: c.isFeatured,
        isFeatured: c.isFeatured,
        hiringStatus: "unknown",
        verifiedById: adminId,
      },
    });
  }
  console.log(`[seed] Companies ready: ${seedCompanies.length}`);

  const jobs = buildSeedJobs(seedCompanies);
  let created = 0;
  let updated = 0;
  for (const j of jobs) {
    const company = await prisma.company.findUnique({ where: { slug: slugify(j.companyName) } });
    if (!company) continue;
    const existing = await prisma.job.findFirst({
      where: { companyId: company.id, title: j.title },
    });
    const data = {
      title: j.title,
      companyId: company.id,
      category: j.category,
      location: j.location,
      type: TYPE_ENUM[j.type],
      workMode: WORKMODE_ENUM[j.workMode],
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      isStipend: Boolean(j.isStipend),
      experience: j.experience,
      skills: j.skills,
      description: j.description,
      responsibilities: j.responsibilities,
      requirements: j.requirements,
      benefits: j.benefits,
      status: JobStatus.OPEN,
      isModerated: true,
      createdBy: adminId,
      vacancy: 1,
      applicationDeadline: new Date(`${j.deadline}T00:00:00.000Z`),
      createdAt: new Date(`${j.createdAt}T00:00:00.000Z`),
    };
    if (existing) {
      await prisma.job.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.job.create({ data });
      created += 1;
    }
  }
  console.log(`[seed] Jobs ready: ${created} created, ${updated} updated`);

  // Clear old demo flags on any pre-existing jobs.
  await prisma.job.updateMany({ data: { isModerated: true } });
}

// The two active internship roles powering the AI video interview system.
const INTERN_JOBS = [
  {
    title: "Frontend Developer Intern",
    category: "INTERNSHIP",
    skills: ["HTML", "CSS", "JavaScript", "React", "Git/GitHub", "Responsive Design"],
    description:
      "Join UpJob as a Frontend Developer Intern. You will own UI features end-to-end, work closely with design and product, and learn shipping-fast practices in a startup environment. Your application is screened by our AI interviewer (~15 minute video interview) before an HR review.",
    requirements: [
      "Good grasp of HTML, CSS and modern JavaScript (ES6+)",
      "Comfortable with React (components, props, state)",
      "Understands the DOM, APIs and basic responsive design",
      "Eager to learn, debug methodically and communicate clearly",
    ],
    benefits: ["Stipend", "Certificate of Internship", "Mentorship", "Pre-placement offer for top performers"],
  },
  {
    title: "Business Development Executive Intern",
    category: "INTERNSHIP",
    skills: ["Communication", "Lead Generation", "Cold Calling", "Negotiation", "CRM Basics"],
    description:
      "Join UpJob as a Business Development Executive Intern. You will generate leads, run discovery calls, handle objections and help UpJob sign up companies and partners. Your application is screened by our AI interviewer (~15 minute video interview) before an HR review.",
    requirements: [
      "Clear, confident communication in English",
      "Interest in sales, outreach and client relationships",
      "Comfortable with cold calls/messages and follow-up discipline",
      "Basic working knowledge of spreadsheets or simple CRMs (a plus)",
    ],
    benefits: ["Stipend", "Certificate of Internship", "Sales mentorship", "Incentives on closed deals"],
  },
];

const INTERN_CONFIGS = {
  "frontend-developer-intern": {
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
    maxQuestions: 8,
    minQuestions: 5,
    recordingEnabled: false,
    showScoreToCandidate: false,
  },
  "bde-intern": {
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
    maxQuestions: 8,
    minQuestions: 5,
    recordingEnabled: false,
    showScoreToCandidate: false,
  },
};

async function seedInternJobs(prisma, adminId) {
  const company = await prisma.company.upsert({
    where: { name: "UpJob" },
    update: { isVerified: true, isFeatured: true },
    create: {
      name: "UpJob",
      slug: "upjob",
      logo: "/upjob-mark.svg",
      industry: "Technology",
      location: "Remote",
      companySize: "11-50",
      description: "UpJob — Intern Today. Get Hired Tomorrow.",
      website: "https://upjob.app",
      isVerified: true,
      isFeatured: true,
      verifiedById: adminId,
    },
  });

  const stipends = {
    "frontend-developer-intern": 10000,
    "bde-intern": 10000,
  };

  for (const job of INTERN_JOBS) {
    const existing = await prisma.job.findFirst({
      where: { companyId: company.id, title: job.title },
    });
    const data = {
      title: job.title,
      companyId: company.id,
      category: job.category,
      location: "Remote",
      type: JobType.INTERNSHIP,
      workMode: WorkMode.REMOTE,
      salaryMin: stipends[roleKey(job.title)],
      salaryMax: null,
      isStipend: true,
      experience: "0-1 years",
      skills: job.skills,
      description: job.description,
      responsibilities: ["Work on real product tasks with a mentor", "Collaborate with the team in daily standups", "Ship measurable outcomes each sprint"],
      requirements: job.requirements,
      benefits: job.benefits,
      status: JobStatus.OPEN,
      isModerated: true,
      createdBy: adminId,
    };
    if (existing) {
      await prisma.job.update({ where: { id: existing.id }, data });
      console.log(`[seed] Intern job ready: ${job.title}`);
    } else {
      await prisma.job.create({ data });
      console.log(`[seed] Intern job created: ${job.title}`);
    }
  }

  for (const [key, cfg] of Object.entries(INTERN_CONFIGS)) {
    await prisma.interviewConfig.upsert({
      where: { role: key },
      update: { data: cfg },
      create: { role: key, data: cfg },
    });
  }
  console.log("[seed] Interview configs ready for Frontend + BDE");
}

async function seedInterviewers(prisma) {
  let created = 0;
  let updated = 0;
  for (const i of INTERVIEWERS) {
    const existing = await prisma.interviewer.findUnique({ where: { key: i.key } });
    if (existing) {
      await prisma.interviewer.update({
        where: { key: i.key },
        data: {
          name: i.name,
          description: i.description,
          image: i.image,
          empathy: i.empathy,
          exploration: i.exploration,
          rapport: i.rapport,
          speed: i.speed,
          voiceHint: i.voiceHint,
          active: true,
        },
      });
      updated += 1;
    } else {
      await prisma.interviewer.create({ data: i });
      created += 1;
    }
  }
  console.log(`[seed] Interviewers ready: ${created} created, ${updated} updated`);
}

function roleKey(title) {
  const t = title.toLowerCase();
  if (t.includes("business development")) return "bde-intern";
  return "frontend-developer-intern";
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

main().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});