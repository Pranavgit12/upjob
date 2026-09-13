import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function serialize(c: { id: string; name: string; slug: string; logo: string | null; industry: string; location: string; companySize: string; description: string; website: string | null; isVerified: boolean; isFeatured: boolean; isPartner: boolean; hiringStatus: string }) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    logo: c.logo,
    industry: c.industry,
    location: c.location,
    companySize: c.companySize,
    description: c.description,
    website: c.website,
    isVerified: c.isVerified,
    isFeatured: c.isFeatured,
    isPartner: c.isPartner,
    hiringStatus: c.hiringStatus,
  };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "employer" && user.role !== "admin") {
    return NextResponse.json({ error: "Only employers manage companies" }, { status: 403 });
  }

  const employer = await prisma.employer.findUnique({
    where: { userId: user.id },
    select: { company: true },
  });

  if (!employer?.company) {
    return NextResponse.json({ company: null });
  }
  return NextResponse.json({ company: serialize(employer.company as never) });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "employer") {
    return NextResponse.json({ error: "Only employers can create companies" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Company name is required" }, { status: 400 });

  const slug = slugify(name);
  let company = await prisma.company.findUnique({ where: { slug } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        name,
        slug,
        industry: String(body.industry || "Technology").slice(0, 80),
        location: String(body.location || "Remote").slice(0, 120),
        companySize: String(body.companySize || "11-50").slice(0, 40),
        description: String(body.description || "").slice(0, 2000),
        website: typeof body.website === "string" && body.website ? body.website.slice(0, 200) : null,
        hiringStatus: "unknown",
      },
    });
  }

  await prisma.employer.upsert({
    where: { userId: user.id },
    update: { companyId: company.id },
    create: { userId: user.id, companyId: company.id },
  });

  return NextResponse.json({ company: serialize(company as never) }, { status: 201 });
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "employer") {
    return NextResponse.json({ error: "Only employers can edit their company" }, { status: 403 });
  }

  const employer = await prisma.employer.findUnique({
    where: { userId: user.id },
    select: { companyId: true },
  });
  if (!employer?.companyId) {
    return NextResponse.json({ error: "No company linked to your account" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 160);
  if (typeof body.industry === "string") data.industry = body.industry.slice(0, 80);
  if (typeof body.location === "string") data.location = body.location.slice(0, 120);
  if (typeof body.description === "string") data.description = body.description.slice(0, 2000);
  if (typeof body.website === "string") data.website = body.website.slice(0, 200) || null;
  if (typeof body.companySize === "string") data.companySize = body.companySize.slice(0, 40);

  const updated = await prisma.company.update({
    where: { id: employer.companyId },
    data: data as never,
  });

  return NextResponse.json({ company: serialize(updated as never) });
}