import type { MetadataRoute } from "next";
import { getCompanies, getOpenJobs } from "@/lib/db-data";

// Generated per request. Prerendering queried Postgres during `next build`,
// which made the build depend on a reachable database.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://upjob.app").replace(/\/+$/, "");
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/jobs`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/internships`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/companies`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/resources`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const [openJobs, companies] = await Promise.all([getOpenJobs(), getCompanies()]);

  const jobRoutes = openJobs.map((job) => ({
    url: `${baseUrl}/jobs/${job.id}`,
    lastModified: new Date(job.createdAt),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const companyRoutes = companies.map((company) => ({
    url: `${baseUrl}/companies/${company.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...jobRoutes, ...companyRoutes];
}