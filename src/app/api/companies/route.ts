import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await prisma.company.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    companies: rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      logo: r.logo,
      industry: r.industry,
      location: r.location,
      companySize: r.companySize,
      description: r.description,
      website: r.website,
      founded: r.founded,
      headquarters: r.headquarters,
      isPartner: r.isPartner,
      isVerified: r.isVerified,
      isFeatured: r.isFeatured,
      hiringStatus: r.hiringStatus,
    })),
  });
}