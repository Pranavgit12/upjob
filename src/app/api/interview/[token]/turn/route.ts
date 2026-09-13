import { NextResponse } from "next/server";
import { advanceInterview, NotFoundError, ConflictError } from "@/lib/interview";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export async function POST(req: Request, { params }: Params) {
  const { token } = await params;
  let body: { transcript?: string; durationSeconds?: number; questionIndex?: number; questionId?: string; requestId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  try {
    const result = await advanceInterview(token, {
      transcript: String(body.transcript ?? "").slice(0, 8000),
      durationSeconds: Math.max(0, Math.round(Number(body.durationSeconds) || 0)),
      questionIndex: Math.max(0, Math.round(Number(body.questionIndex) || 0)),
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    if (err instanceof ConflictError) return NextResponse.json({ error: err.message }, { status: 409 });
    return NextResponse.json({ error: "Failed to process turn" }, { status: 500 });
  }
}