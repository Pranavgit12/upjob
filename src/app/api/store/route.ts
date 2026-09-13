import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const row = await prisma.userStore.findUnique({
    where: { userId_key: { userId: user.id, key } },
  });

  return NextResponse.json({ value: row?.value ?? null });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { key?: string; value?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.key || typeof body.key !== "string") {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  await prisma.userStore.upsert({
    where: { userId_key: { userId: user.id, key: body.key } },
    update: { value: body.value as object },
    create: { userId: user.id, key: body.key, value: (body.value as object) ?? {} },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  await prisma.userStore.deleteMany({ where: { userId: user.id, key: body.key } });
  return NextResponse.json({ ok: true });
}