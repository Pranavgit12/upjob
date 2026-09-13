import { NextResponse } from "next/server";
import { completeInterview, NotFoundError, ConflictError } from "@/lib/interview";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

// Legacy/text submit path — delegates to the new completion pipeline
// (evaluation + report generation). Kept for old invite links.
export async function POST(_req: Request, { params }: Params) {
  const { token } = await params;
  try {
    const result = await completeInterview(token);
    return NextResponse.json({ status: result.status, message: result.message });
  } catch (err) {
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    if (err instanceof ConflictError) return NextResponse.json({ error: err.message }, { status: 409 });
    return NextResponse.json({ error: "Failed to complete interview" }, { status: 500 });
  }
}