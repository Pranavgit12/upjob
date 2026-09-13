import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const CONFIGS = {
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

async function main() {
  for (const [role, data] of Object.entries(CONFIGS)) {
    await prisma.interviewConfig.upsert({
      where: { role },
      update: { data },
      create: { role, data },
    });
    console.log(`[patch] InterviewConfig ${role} updated`);
  }
  const bdeJob = await prisma.job.updateMany({
    where: { title: { contains: "Business Development" }, isStipend: true },
    data: { salaryMin: 10000 },
  });
  const feJob = await prisma.job.updateMany({
    where: { title: { contains: "Frontend" }, isStipend: true },
    data: { salaryMin: 10000 },
  });
  console.log(`[patch] interns stipend updated: BDE matched=${bdeJob.count}, Frontend matched=${feJob.count}`);
}

main()
  .catch((err) => {
    console.error("[patch] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());