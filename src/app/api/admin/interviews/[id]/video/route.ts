import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInterviewRecording } from "@/lib/local-recordings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "employer")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const interview = await prisma.aiInterview.findUnique({
    where: { id },
    select: {
      recordingDriveFileId: true,
      recordingMimeType: true,
      application: { select: { job: { select: { createdBy: true } } } },
    },
  });
  if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  if (user.role === "employer" && interview.application.job.createdBy !== user.id) {
    return NextResponse.json({ error: "You don't manage this candidate" }, { status: 403 });
  }
  if (!interview.recordingDriveFileId) return NextResponse.json({ error: "No recording available" }, { status: 404 });

  try {
    const stream = await getInterviewRecording(interview.recordingDriveFileId);
    return new NextResponse(stream, {
      headers: {
        "Content-Type": interview.recordingMimeType ?? "video/webm",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Interview recording download failed", error);
    return NextResponse.json({ error: "Could not load the recording" }, { status: 503 });
  }
}
