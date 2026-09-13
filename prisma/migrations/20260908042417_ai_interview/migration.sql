-- CreateEnum
CREATE TYPE "AiInterviewStatus" AS ENUM ('INVITED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED');

-- CreateTable
CREATE TABLE "AiInterview" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "inviteToken" TEXT NOT NULL,
    "status" "AiInterviewStatus" NOT NULL DEFAULT 'INVITED',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "maxSteps" INTEGER NOT NULL DEFAULT 6,
    "questions" JSONB,
    "score" INTEGER,
    "summary" TEXT,
    "verdict" TEXT,
    "strengths" TEXT[],
    "concerns" TEXT[],
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiInterview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiInterviewMessage" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiInterviewMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiInterview_applicationId_key" ON "AiInterview"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "AiInterview_inviteToken_key" ON "AiInterview"("inviteToken");

-- AddForeignKey
ALTER TABLE "AiInterview" ADD CONSTRAINT "AiInterview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiInterviewMessage" ADD CONSTRAINT "AiInterviewMessage_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "AiInterview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
