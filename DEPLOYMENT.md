# Deploying UpJob

Self-hosted deployment for the Next.js App Router app. Two supported paths:

| Path                | Use when                                                        |
| ------------------- | --------------------------------------------------------------- |
| **Docker Compose**  | Default. Brings up Postgres, runs migrations, starts the app.    |
| **Manual / systemd**| Managed database, existing reverse proxy, or no Docker available. |

---

## 1. Prerequisites

- Node.js 20+ (the Docker images bundle their own Node 20)
- Docker Engine 24+ with the Compose v2 plugin — for the Compose path
- A domain with DNS pointed at the host
- A TLS terminator: Caddy, nginx, or a cloud load balancer

---

## 2. Configure

```bash
git clone <your-fork-url> upjob && cd upjob
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

## 3. Deploy with Docker Compose

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
`.next/standalone` is produced by the build; `npm run start` serves it.

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
container**. Behind multiple replicas, enforce real limits at the edge (nginx
`limit_req`) instead of trusting the app. Sessions are stateless JWTs, so
horizontal scaling of the app itself is fine.

---

## 7. Troubleshooting

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
