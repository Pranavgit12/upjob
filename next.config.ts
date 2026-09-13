import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep DB-backed prerenders serial: the Supabase pooler session pool
    // (pool_size 15) is exhausted when 7 parallel workers each hand out 8 pages,
    // causing P2039 (EMAXCONNSESSION) during `next build`.
    staticGenerationMaxConcurrency: 1,
  },
};

export default nextConfig;
