import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const target = await prisma.user.findMany({
    where: { role: { not: "ADMIN" } },
    select: { id: true, email: true, name: true },
  });
  if (target.length === 0) {
    console.log("No non-admin users to delete.");
    await prisma.$disconnect();
    return;
  }

  console.log(`Deleting ${target.length} non-admin users:`);
  for (const u of target) console.log(`  - ${u.email} (${u.name})`);

  const confirm = process.argv[2];
  if (confirm !== "--yes") {
    console.log("\nDry run — add --yes to actually delete. Nothing was changed.");
    await prisma.$disconnect();
    return;
  }

  const ids = target.map((u) => u.id);

  // Interviewer is referenced by AiInterview — keep interviewers (shared personas),
  // but clear all per-candidate ai interview data first (deepest children).
  await prisma.integrityEvent.deleteMany({ where: { interview: { application: { userId: { in: ids } } } } });
  await prisma.interviewFeedback.deleteMany({ where: { interview: { application: { userId: { in: ids } } } } });
  await prisma.aiInterviewAnswer.deleteMany({ where: { interview: { application: { userId: { in: ids } } } } });
  await prisma.aiInterviewMessage.deleteMany({ where: { interview: { application: { userId: { in: ids } } } } });
  await prisma.aiInterview.deleteMany({ where: { application: { userId: { in: ids } } } });

  await prisma.interview.deleteMany({ where: { userId: { in: ids } } });
  await prisma.application.deleteMany({ where: { userId: { in: ids } } });

  const profileIds = (await prisma.candidateProfile.findMany({ where: { userId: { in: ids } }, select: { id: true } })).map((p) => p.id);
  await prisma.certification.deleteMany({ where: { profileId: { in: profileIds } } });
  await prisma.project.deleteMany({ where: { profileId: { in: profileIds } } });
  await prisma.experience.deleteMany({ where: { profileId: { in: profileIds } } });
  await prisma.education.deleteMany({ where: { profileId: { in: profileIds } } });
  await prisma.candidateProfile.deleteMany({ where: { userId: { in: ids } } });

  await prisma.resume.deleteMany({ where: { userId: { in: ids } } });
  await prisma.savedJob.deleteMany({ where: { userId: { in: ids } } });
  await prisma.report.deleteMany({ where: { userId: { in: ids } } });
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.userStore.deleteMany({ where: { userId: { in: ids } } });
  await prisma.employer.deleteMany({ where: { userId: { in: ids } } });

  const result = await prisma.user.deleteMany({ where: { role: { not: "ADMIN" } } });
  console.log(`\nDeleted ${result.count} users. Remaining:`);
  const remaining = await prisma.user.findMany({ select: { email: true, role: true } });
  console.log(remaining);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});