import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { phone: true, createdAt: true },
  });

  return NextResponse.json({
    user: { ...user, phone: record?.phone ?? null, createdAt: record?.createdAt ?? null },
  });
}