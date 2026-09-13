import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveInterviewRecording } from "@/lib/local-recordings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ token: string }> };

export async function POST(req: Request, { params }: Params) {
  const { token } = await params;
  const interview = await prisma.aiInterview.findUnique({
    where: { inviteToken: token },
    select: {
      id: true,
      recordingConsent: true,
      application: { select: { user: { select: { name: true } }, job: { select: { title: true } } } },
    },
  });
  if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  if (!interview.recordingConsent) return NextResponse.json({ error: "Recording consent was not provided" }, { status: 403 });

  const contentType = req.headers.get("content-type") || "video/webm";
  if (!contentType.startsWith("video/")) return NextResponse.json({ error: "Expected a video recording" }, { status: 400 });
  const body = Buffer.from(await req.arrayBuffer());
  if (body.length === 0) return NextResponse.json({ error: "Recording is empty" }, { status: 400 });
  if (body.length > 500 * 1024 * 1024) return NextResponse.json({ error: "Recording is too large" }, { status: 413 });

  try {
    const extension = contentType.includes("mp4") ? "mp4" : "webm";
    const safeName = `${interview.application.user.name}-${interview.application.job.title}`
      .replace(/[^\w.-]+/g, "_")
      .slice(0, 120);
    const fileName = `${safeName}-${interview.id}.${extension}`;
    const savedName = await saveInterviewRecording(fileName, body, contentType);
    await prisma.aiInterview.update({
      where: { id: interview.id },
      data: { recordingDriveFileId: savedName, recordingMimeType: contentType },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Interview recording upload failed", error);
    return NextResponse.json({ error: "Could not save the recording" }, { status: 503 });
  }
}
