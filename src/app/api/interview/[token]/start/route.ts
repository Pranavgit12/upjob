import { NextResponse } from "next/server";
import { startInterview, NotFoundError, ConflictError, ValidationError } from "@/lib/interview";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export async function POST(req: Request, { params }: Params) {
  const { token } = await params;
  let body: { agreed?: boolean; recordingConsent?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  try {
    const result = await startInterview(token, {
      agreed: Boolean(body.agreed),
      recordingConsent: Boolean(body.recordingConsent),
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    if (err instanceof ConflictError) return NextResponse.json({ error: err.message }, { status: 409 });
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: "Failed to start interview" }, { status: 500 });
  }
}