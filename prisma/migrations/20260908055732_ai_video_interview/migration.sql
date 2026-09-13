/*
  Warnings:

  - Added the required column `updatedAt` to the `Interview` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AiInterview" ADD COLUMN     "categoryScores" JSONB,
ADD COLUMN     "config" JSONB,
ADD COLUMN     "consentAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "currentPhase" TEXT,
ADD COLUMN     "cvData" JSONB,
ADD COLUMN     "cvText" TEXT,
ADD COLUMN     "durationSeconds" INTEGER,
ADD COLUMN     "recommendation" TEXT,
ADD COLUMN     "recordingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "report" JSONB;

-- AlterTable
ALTER TABLE "Interview" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'scheduled',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Resume" ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "parsedText" TEXT,
ADD COLUMN     "path" TEXT,
ADD COLUMN     "structuredData" JSONB;

-- CreateTable
CREATE TABLE "AiInterviewAnswer" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "category" TEXT,
    "difficulty" TEXT,
    "competency" TEXT,
    "transcript" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "questionIndex" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiInterviewAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrityEvent" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewConfig" (
    "role" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewConfig_pkey" PRIMARY KEY ("role")
);

-- AddForeignKey
ALTER TABLE "AiInterviewAnswer" ADD CONSTRAINT "AiInterviewAnswer_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "AiInterview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrityEvent" ADD CONSTRAINT "IntegrityEvent_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "AiInterview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
