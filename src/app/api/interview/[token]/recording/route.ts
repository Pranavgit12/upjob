import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveInterviewRecordingStream } from "@/lib/local-recordings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_RECORDING_BYTES = 500 * 1024 * 1024;
const SIZE_ERROR = "Recording is too large";

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

  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > MAX_RECORDING_BYTES) {
    return NextResponse.json({ error: SIZE_ERROR }, { status: 413 });
  }
  if (!req.body) return NextResponse.json({ error: "Recording is empty" }, { status: 400 });

  try {
    const extension = contentType.includes("mp4") ? "mp4" : "webm";
    const safeName = `${interview.application.user.name}-${interview.application.job.title}`
      .replace(/[^\w.-]+/g, "_")
      .slice(0, 120);
    const fileName = `${safeName}-${interview.id}.${extension}`;
    const savedName = await saveInterviewRecordingStream(fileName, limitStream(req.body), contentType);
    await prisma.aiInterview.update({
      where: { id: interview.id },
      data: { recordingFileId: savedName, recordingMimeType: contentType },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === SIZE_ERROR) {
      return NextResponse.json({ error: SIZE_ERROR }, { status: 413 });
    }
    console.error("Interview recording upload failed", error);
    return NextResponse.json({ error: "Could not save the recording" }, { status: 503 });
  }
}

// Guards against oversized uploads even when the client doesn't send a
// Content-Length header (chunked transfer).
function limitStream(stream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  let total = 0;
  const transformer = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      total += chunk.byteLength;
      if (total > MAX_RECORDING_BYTES) controller.error(new Error(SIZE_ERROR));
      else controller.enqueue(chunk);
    },
  });
  return stream.pipeThrough(transformer);
}