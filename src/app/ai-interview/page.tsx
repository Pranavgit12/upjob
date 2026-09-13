import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { createAiInterviewForApplication } from "@/lib/interview";
import { getInternRoleByJob } from "@/lib/ai/config";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AiInterviewPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/ai-interview");
  if (user.role !== "candidate") redirect(user.role === "admin" ? "/admin" : "/employer");

  const applications = await prisma.application.findMany({
    where: { userId: user.id, status: { notIn: ["SELECTED", "REJECTED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      job: { select: { id: true, title: true } },
      aiInterview: { select: { id: true, inviteToken: true, status: true } },
    },
  });

  // Prefer the most recent application that maps to an AI-interviewable role.
  const eligible = applications.find((a) => getInternRoleByJob(a.job.title));
  if (eligible) {
    let token = eligible.aiInterview?.inviteToken ?? null;
    if (!token || (eligible.aiInterview?.status === "COMPLETED" || eligible.aiInterview?.status === "EXPIRED")) {
      const created = await createAiInterviewForApplication(eligible.id);
      token = created.inviteToken;
    }
    redirect(`/interview/${token}/check`);
  }

  // No applicable application yet — point them at the two live internships.
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container-upjob mx-auto max-w-3xl flex-1 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">UpJob AI Interview</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
          Pick an internship to start your AI interview
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-500">
          The AI interviewer reads your CV and asks ~7 personalized questions. During the interview
          your camera and microphone stay on, and your spoken answers are transcribed for review.
          Shortlisting and rejection are decided by our admin team only — expect the verdict within
          24–48 hours after your interview.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/dashboard/ai">Choose an internship</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/resume">Upload CV first</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}