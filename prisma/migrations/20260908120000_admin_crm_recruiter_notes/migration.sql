-- Admin CRM + recruiter decisions
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "Application" ADD COLUMN "recruiterNotes" TEXT;