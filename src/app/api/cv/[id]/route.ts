import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { deleteFile } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Delete a CV. Only its owner (or an admin) may delete it. Applications keep
// their other data; the resume reference is set to null via the schema's
// onDelete behaviour... (Application.resume is optional with no cascade, so we
// null it explicitly below.)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const resume = await prisma.resume.findUnique({
    where: { id },
    select: { userId: true, path: true },
  });
  if (!resume) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (resume.userId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "You don't have access to this file" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.application.updateMany({
      where: { resumeId: id },
      data: { resumeId: null },
    }),
    prisma.resume.delete({ where: { id } }),
  ]);

  // Best-effort object deletion: a leftover blob is an orphaned-cost issue, a
  // missing one is not a reason to fail the request already committed above.
  if (resume.path) {
    await deleteFile(resume.path).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}