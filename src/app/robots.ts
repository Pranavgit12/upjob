import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Auth and admin surfaces must never be indexed.
      disallow: [
        "/dashboard",
        "/employer",
        "/admin",
        "/logout",
        "/login",
        "/signup",
        "/reset-password",
        "/forgot-password",
        "/api/",
        "/interview/",
      ],
    },
    sitemap: "https://upjob.app/sitemap.xml",
  };
}
