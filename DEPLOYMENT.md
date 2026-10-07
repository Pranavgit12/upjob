# Deploying UpJob

The primary path is **Vercel**. A self-hosted Docker path is kept for running
the app on a VPS.

| Path                | Use when                                                        |
| ------------------- | --------------------------------------------------------------- |
| **Vercel**          | Default. Serverless, managed TLS, no server to maintain.        |
| **Docker Compose**  | Self-hosting on a VPS you control.                               |
| **Manual / systemd**| Managed database, existing reverse proxy, or no Docker available. |

---

## 1. Vercel (primary)

### 1.1 Project setup

1. Import the repo at <https://github.com/Pranavgit12/upjob> into Vercel.
2. Framework preset: **Next.js**. Build command `npm run build`, install
   `npm ci` — both are already the defaults.
3. Add the environment variables below under **Settings → Environment
   Variables**, for **both** Production and Preview.

> **`NEXT_PUBLIC_*` values are inlined into the client bundle at build time.**
> Changing one in the Vercel UI has no effect until you redeploy. If
> `NEXT_PUBLIC_APP_URL` is wrong the first time you build, password-reset and
> OAuth links will point at the wrong origin and you must redeploy to fix it.
> Use the **same value** for Preview and Production, or accept that preview
> emails link back to production.

Required:

| Variable              | Notes                                                        |
| --------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`        | Managed Postgres connection string.                         |
| `AUTH_SECRET`         | ≥ 32 chars (`openssl rand -base64 48`). Rotating signs everyone out. |
| `NEXT_PUBLIC_APP_URL` | Public origin, no trailing slash.                            |

For Vercel, set both `MAX_CV_SIZE_MB` and `NEXT_PUBLIC_MAX_CV_SIZE_MB` to `4`.
Vercel Functions cap request bodies at 4.5 MB, including multipart overhead;
the current CV route sends the file through a Function, so the 10 MB local
default is too large for Vercel.

Strongly recommended:

| Variable                     | Notes                                              |
| ---------------------------- | -------------------------------------------------- |
| `RESEND_API_KEY`             | Without it OTP login fails `503`.                  |
| `RESEND_FROM_EMAIL`          | Must be a verified Resend domain.                  |
| `GOOGLE_CLIENT_ID` / `_SECRET` | Add the callback URL shown in the Vercel dashboard. |
| `S3_*`                       | Required for CV uploads and interview recordings.  |
| `OTP_MODE`                   | `required` (default) · `optional` · `off`.         |

### 1.2 Migrations

Vercel does **not** run `prisma migrate deploy` for you. `.github/workflows/migrate.yml`
does it on push to `main`, then fires a deploy hook.

Add two repository secrets under **Settings → Secrets and variables → Actions**:

| Secret                   | Value                                              |
| ------------------------ | -------------------------------------------------- |
| `DATABASE_URL`           | Production Postgres connection string.             |
| `VERCEL_DEPLOY_HOOK_URL` | Project → Settings → Git → Deploy Hooks → Create. Optional. |

Then **turn off "Deploy on Push"** in the Vercel project settings. If you leave
it on, Vercel deploys immediately on push while the migration is still running,
so the new code briefly serves traffic against a schema that has no
`OtpChallenge` table and login fails. With auto-deploy off, the workflow migrates
first and deploys second.

If you would rather keep Vercel's auto-deploy, delete the hook secret and accept
the race, or run `npx prisma migrate deploy` yourself before the deploy.

### 1.3 Serverless caveats

Two behaviours that are correct on a long-lived server but not on serverless
functions, and that need an explicit decision from you:

- **Rate limits are per-instance.** `src/lib/rate-limit.ts` keeps counters in
  process memory. Vercel recycles instances and runs many in parallel, so
  login/OTP/reset limits are **weaker than they look** and are not a reliable
  brute-force defence. Put real limits at the edge — Vercel WAF / firewall
  rules, or a rate-limit proxy — before treating them as one.
- **Stateless sessions.** Sessions are JWTs, so horizontal scaling is fine and
  no sticky sessions are needed.
- **Interview recording uploads exceed Vercel's request limit.** The current
  browser posts the completed recording to a Function, which then buffers it
  before writing to S3-compatible storage. The Function request limit is 4.5 MB,
  while this endpoint accepts up to 500 MB. Recordings larger than the platform
  limit will receive a 413 before the handler runs. Supporting normal interview
  recordings on Vercel requires uploading directly from the browser to object
  storage with a short-lived signed URL, then finalizing the database record.
  The current recording upload flow is therefore not production-ready on Vercel.

### 1.4 Verify

```bash
curl -fsS https://your-domain/api/health
```

Then sign in end to end: password → carrier picker → code → dashboard, and
confirm the Resend email actually arrives. The health check only proves the
database is reachable, not that OTP delivery works.

---

## 2. Docker Compose (self-hosted VPS)

### 2.1 Prerequisites

- Node.js 20+ (the images bundle their own Node 20)
- Docker Engine 24+ with the Compose v2 plugin
- A domain with DNS pointed at the host
- A TLS terminator: Caddy, nginx, or a cloud load balancer

### 2.2 Configure

```bash
git clone https://github.com/Pranavgit12/upjob.git && cd upjob
cp .env.example .env
openssl rand -base64 48   # -> AUTH_SECRET
```

Fill in `.env`. The values that are easy to get wrong:

| Variable               | Notes                                                                       |
| ---------------------- | --------------------------------------------------------------------------- |
| `AUTH_SECRET`          | ≥ 32 chars. The app **refuses to start** otherwise. Rotating it signs out everyone. |
| `NEXT_PUBLIC_APP_URL`  | Public origin, no trailing slash. Wrong value silently breaks reset + OAuth links. |
| `POSTGRES_PASSWORD`    | Required. Compose fails fast if unset.                                       |
| `RESEND_API_KEY`       | Without it the Email carrier is hidden and login fails (**503** if no carrier is configured, **502** if a send fails) rather than reporting a code nobody received. |
| `OTP_MODE`             | `required` (default) · `optional` · `off`.                                  |

`DATABASE_URL` in `.env` is used for `npm run dev` and manual deployments. Under
Compose it is **ignored** — Compose composes the URL from `POSTGRES_*` so the host
is the `db` service, not `localhost`. Use `DATABASE_URL_SSL_PARAM` to add query
parameters.

> `.env` is gitignored. Never commit it, and never paste its contents into a chat
> or issue. Rotate any secret that has been shared.

---

## 3. Start the stack

```bash
docker compose up -d --build
docker compose logs -f migrate   # must exit 0 before app starts
docker compose ps
curl -fsS localhost:3000/api/health
```

How the startup ordering works:

- `db` becomes healthy only after `pg_isready` succeeds.
- `migrate` runs `prisma migrate deploy` and must **exit 0**.
- `app` starts only once `migrate` completes successfully.

So a deploy can never serve code against an out-of-date schema. If a migration
fails, `app` deliberately does not start — fix the migration and re-run.

Seed an admin account once:

```bash
docker compose run --rm app npx prisma db seed
```

### Verify

```bash
docker compose ps                                  # app = healthy
docker compose logs app | grep -i startup          # "Configuration validated."
curl -I https://your-domain/api/health
```

The app is bound to `APP_PORT` (default `3000`). Put the reverse proxy in front of
it and terminate TLS there; do not expose `3000` directly to the internet.

---

## 4. Deploy without Docker

```bash
npm ci
npx prisma migrate deploy
npm run build
npm run start          # or systemd, pm2, etc.
```

Environment comes from the process manager, not from a baked `.env` file.
The standalone bundle is only produced when `NEXT_OUTPUT_STANDALONE=1` is set,
which the Dockerfile does for its own build. To deploy that way yourself:

```bash
NEXT_OUTPUT_STANDALONE=1 npm run build
node .next/standalone/server.js
```

> **If you copy `.next/standalone` to the server, delete `.next/standalone/.env`
> first.** The build copies your local `.env` into the standalone output, so that
> copy carries `AUTH_SECRET`, `RESEND_API_KEY` and every other secret as a
> plaintext file inside the deployed artifact. The Docker path is not affected —
> `.dockerignore` excludes `.env`, so the image is built without it — and the app
> reads all server configuration from the environment at runtime, so nothing is
> lost by removing the file.

With systemd, a minimal unit:

```ini
[Unit]
Description=UpJob
After=network-online.target

[Service]
WorkingDirectory=/srv/upjob
EnvironmentFile=/srv/upjob/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start
Restart=always
User=upjob

[Install]
WantedBy=multi-user.target
```

---

## 5. Login-time two-step verification

`OTP_MODE` controls who is challenged for a one-time code after entering their
password.

- `required` — every non-admin login is challenged. Admins are exempt so a broken
  mail transport cannot lock you out of the admin panel.
- `optional` — challenged only when the user enables it in
  **Settings → Security → Two-step verification**.
- `off` — disabled. A deliberate escape hatch; the picker is hidden.

Carriers:

- **Email** via Resend. Needs `RESEND_API_KEY` and a verified domain.
- **Text message** via a Twilio-compatible REST API. Needs `SMS_ACCOUNT_SID`,
  `SMS_AUTH_TOKEN` and `SMS_FROM`, **and** the user must have a phone number on
  their profile. It is hidden from the picker otherwise, so an unconfigured SMS
  provider degrades to email-only instead of producing a dead end.

If neither carrier is usable, logins fail loudly instead of stranding the user:
`503` when no carrier is configured, `502` when a configured carrier's send
fails. Check the app log for the carrier error.

Codes are stored hashed, single-use, short-lived, and invalidated by a resend.
A successful second factor bumps the user's `sessionVersion`, so sessions issued
before the login are dead.

Delivery failures **fail closed**: if no carrier is configured, or a send fails,
the login is refused (`503` / `502`) rather than completed without the code.
Google sign-in is held to the same rule — otherwise a Resend outage would
silently turn "Sign in with Google" into a way to skip the second factor. When
this happens the user lands on `/login?error=otp_unavailable` and can retry or
use the password flow.

---

## 6. Operations

```bash
docker compose logs -f app
docker compose restart app
docker compose pull && docker compose up -d --build    # redeploy
docker compose down                                     # keeps the volume
docker compose down -v                                  # DESTROYS the database
```

### Backups

`pgdata` is the only stateful part:

```bash
docker compose exec -T db pg_dump -U upjob upjob | gzip > backup-$(date +%F).sql.gz
```

### Scaling

`src/lib/rate-limit.ts` keeps counters in process memory, so limits apply **per
container** — and per serverless instance on Vercel, where they are weakest of
all (see §1.3). Behind multiple replicas, enforce real limits at the edge (nginx
`limit_req`, or Vercel firewall rules) instead of trusting the app. Sessions are
stateless JWTs, so horizontal scaling of the app itself is fine.

---

## 7. Dependency audit

`npm audit` is expected to report **3 high** vulnerabilities, all from a single
`deepmerge-ts` advisory. This is deliberate — do not "fix" it without reading this.

| Package       | Path                                          | In the deployed app? |
| ------------- | --------------------------------------------- | -------------------- |
| `deepmerge-ts`| `prisma` → `@prisma/config` (devDependency)   | No                  |
| `mysql2`      | `prisma` (devDependency)                      | No — forced to 3.24.5 |

Both are reachable only from the Prisma **CLI**, which runs at build/CI time
(`prisma generate`, `migrate deploy`). Neither is a runtime dependency: the
server uses `@prisma/adapter-pg` against Postgres, and `mysql2` is not traced
into `.next` at all. The `mysql2` advisories are MySQL-specific (auth-plugin
downgrade, protocol decompression bomb), which cannot apply to a Postgres app.

The only "fix" npm offers is `npm audit fix --force`, which downgrades
`@prisma/config` 7 → 6. That is a **breaking change** that would break
`prisma.config.ts` and therefore `prisma generate` and `migrate deploy` — i.e. it
would break the deployment pipeline to silence an advisory that is not
exploitable here. Re-check after each `prisma` major upgrade.

Fixed as of `next@16.3.8`: the critical RCE in `next/og`'s `ImageResponse` (not
reachable — the app never imports `next/og`), plus `fast-uri` and
`brace-expansion` in the dev/lint toolchain.

---

## 8. Troubleshooting

**`Configuration validated` never appears, app exits immediately**
A required production variable is missing or malformed. `register()` in
`src/instrumentation.ts` logs the exact list and throws deliberately — a
container that dies is better than one that looks healthy and 500s.

**`P2034` / `EMAXCONNSESSION` / too many connections**
You are on a session-mode pooler. Use the transaction pooler (Supabase: port
`6543`) or raise the limit.

**OTP returns 502 or 503**
`503` means no carrier is configured (set `RESEND_API_KEY`, configure SMS, or
set `OTP_MODE=off` to get back in). `502` means a carrier is configured but the
send failed — check `docker compose logs app` for the transport error.

**Build fails inside Docker with `DATABASE_URL is not set`**
Do not delete the placeholder `ENV DATABASE_URL` in the `deps` and `builder`
stages. `prisma.config.ts` reads it at config-load time. It is never used to
connect.
