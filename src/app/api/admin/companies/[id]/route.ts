import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.isPartner === "boolean") data.isPartner = body.isPartner;
  if (typeof body.isVerified === "boolean") data.isVerified = body.isVerified;
  if (typeof body.isFeatured === "boolean") data.isFeatured = body.isFeatured;
  if (typeof body.hiringStatus === "string") data.hiringStatus = body.hiringStatus;

  const updated = await prisma.company.update({ where: { id }, data: data as never });
  return NextResponse.json({
    ok: true,
    company: {
      id: updated.id,
      isPartner: updated.isPartner,
      isVerified: updated.isVerified,
      isFeatured: updated.isFeatured,
      hiringStatus: updated.hiringStatus,
    },
  });
}