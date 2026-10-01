import "dotenv/config";
import { defineConfig } from "@prisma/config";

/**
 * `env()` throws when the variable is missing, which breaks any command that
 * loads this config without a database - notably `prisma generate` during a
 * Vercel build, and `npx prisma validate` in CI. Generation only parses
 * `schema.prisma` and never opens a connection, so a placeholder is safe here
 * and keeps those paths working. Every command that actually needs a database
 * (`migrate`, `db push`, `studio`) is run with a real `DATABASE_URL` and will
 * fail loudly on its own if it is missing.
 */
const datasourceUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.mjs",
  },
  datasource: {
    url:
      datasourceUrl ??
      "postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public",
  },
});