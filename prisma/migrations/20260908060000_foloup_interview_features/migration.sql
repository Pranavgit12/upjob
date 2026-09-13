-- AlterTable
ALTER TABLE "AiInterview" ADD COLUMN     "anonymous" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "interviewerId" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "themeColor" TEXT;

-- CreateTable
CREATE TABLE "Interviewer" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "empathy" INTEGER NOT NULL DEFAULT 70,
    "exploration" INTEGER NOT NULL DEFAULT 70,
    "rapport" INTEGER NOT NULL DEFAULT 70,
    "speed" INTEGER NOT NULL DEFAULT 50,
    "voiceHint" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interviewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewFeedback" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "satisfaction" INTEGER NOT NULL,
    "comment" TEXT,
    "wouldRecommend" BOOLEAN NOT NULL DEFAULT false,
    "attendance" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Interviewer_key_key" ON "Interviewer"("key");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewFeedback_interviewId_key" ON "InterviewFeedback"("interviewId");

-- CreateIndex
CREATE UNIQUE INDEX "AiInterview_slug_key" ON "AiInterview"("slug");

-- AddForeignKey
ALTER TABLE "AiInterview" ADD CONSTRAINT "AiInterview_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "Interviewer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewFeedback" ADD CONSTRAINT "InterviewFeedback_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "AiInterview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;