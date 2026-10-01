# syntax=docker/dockerfile:1
#
# UpJob — Next.js App Router, self-hosted, `output: "standalone"`.
#
# Targets:
#   migrate  one-shot image with the full toolchain (runs `prisma migrate deploy`)
#   runner   minimal non-root production server (default final stage)
#
# Build both:
#   docker build -t upjob:local .
#   docker compose up -d

# ---------------------------------------------------------------- deps
FROM node:20-alpine AS deps
WORKDIR /app
# libc6-compat is required by the Prisma query engine on Alpine.
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
# .npmrc is required: npm 11 blocks Prisma's install scripts without it.
COPY .npmrc ./
# prisma.config.ts calls env("DATABASE_URL") at config-load time, which throws
# when unset — and it is imported by the postinstall `prisma generate`. The
# schema and a syntactically valid placeholder URL must therefore exist before
# `npm ci` runs. The value is never used to connect: `generate` only reads the
# schema.
COPY prisma.config.ts ./
COPY prisma ./prisma
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
RUN npm ci --no-audit --no-fund

# --------------------------------------------------------------- builder
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Every DB-backed route is `force-dynamic`, so the build no longer reaches
# Postgres. The placeholder only satisfies module-load-time config reads.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"

# Only NEXT_PUBLIC_* values are inlined into the client bundle at build time.
# Server secrets are read at runtime from the container environment, never here.
ARG NEXT_PUBLIC_APP_URL="http://localhost:3000"
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
# Keep the client-side upload cap and the server-side byte cap in agreement.
ARG NEXT_PUBLIC_MAX_CV_SIZE_MB=10
ENV NEXT_PUBLIC_MAX_CV_SIZE_MB=$NEXT_PUBLIC_MAX_CV_SIZE_MB
ARG MAX_CV_SIZE_MB=10
ENV MAX_CV_SIZE_MB=$MAX_CV_SIZE_MB

RUN npm run build

# --------------------------------------------------------------- migrate
# `prisma` and `@prisma/config` are devDependencies, so they are absent from the
# standalone trace. Migrations therefore need an image built from the full
# dependency tree rather than from the runner.
FROM node:20-alpine AS migrate
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV NODE_ENV=production
ENV DATABASE_URL=""
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json prisma.config.ts .npmrc ./
COPY prisma ./prisma
# Runs on container start; exits non-zero if the migration fails, which is what
# `depends_on: condition: service_completed_successfully` keys off.
CMD ["sh", "-c", "npx prisma migrate deploy"]

# ---------------------------------------------------------------- runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# `nextjs` (uid 1001) matches the uid used by the official Next.js image, so a
# bind-mounted volume written by one deployment is readable by the next.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
