import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle with only the traced `node_modules`
  // in `.next/standalone`, which is what the Docker runtime stage copies.
  // Harmless when running `next start` from the repo root.
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,

  experimental: {
    // Keep DB-backed prerenders serial: the Supabase pooler session pool
    // (pool_size 15) is exhausted when 7 parallel workers each hand out 8 pages,
    // causing P2039 (EMAXCONNSESSION) during `next build`.
    staticGenerationMaxConcurrency: 1,
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
