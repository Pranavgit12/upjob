import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { readFileBuffer } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// Access control: the CV owner, or an employer/admin who manages that
// candidate's internship application. Public download is never allowed.
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const resume = await prisma.resume.findUnique({
    where: { id },
    select: { id: true, userId: true, path: true, fileName: true, mimeType: true },
  });
  if (!resume) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = resume.userId === user.id;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    // Employers may only read the CV of a candidate who actually applied to a
    // job they own. Without this check any employer could enumerate resume IDs
    // and download every CV in the system.
    if (user.role !== "employer") {
      return NextResponse.json({ error: "You don't have access to this file" }, { status: 403 });
    }
    const appliedToOwnJob = await prisma.application.count({
      where: { userId: resume.userId, job: { createdBy: user.id } },
    });
    if (appliedToOwnJob === 0) {
      return NextResponse.json({ error: "You don't have access to this file" }, { status: 403 });
    }
  }

  const s3Key = resume.path || "";
  if (!s3Key) {
    return NextResponse.json({ error: "File not stored" }, { status: 404 });
  }
  try {
    const data = await readFileBuffer(s3Key);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": resume.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${resume.fileName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
