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
    // camera/microphone must stay allowed for THIS origin: the AI interview
    // captures the candidate's webcam and mic via getUserMedia, and a `()`
    // denylist applies to the top-level document too, which would make every
    // interview fail with NotAllowedError. Geolocation stays denied.
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // `output: "standalone"` is opt-in, and only the Docker runtime stage needs
  // it. Vercel builds and serves the app itself and does not use the standalone
  // bundle, so it is off by default there rather than being a misleading second
  // artifact. The Dockerfile sets NEXT_OUTPUT_STANDALONE=1 for its own build.
  ...(process.env.NEXT_OUTPUT_STANDALONE === "1" ? { output: "standalone" as const } : {}),
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
