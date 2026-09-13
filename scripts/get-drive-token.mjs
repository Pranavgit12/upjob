// One-time setup helper: exchange a Google OAuth consent code for a Drive
// refresh token and save it to .env:
//   environment: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must already be
//   present in .env. Run `node scripts/get-drive-token.mjs`, open the printed
//   URL, approve access, then paste the *full* redirect URL back.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline/promises";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = path.join(ROOT, ".env");
const REDIRECT_URI = "http://localhost:8765";
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

function loadEnv() {
  const env = {};
  const raw = readFileSync(ENV_PATH, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

function saveRefreshToken(token) {
  let raw = readFileSync(ENV_PATH, "utf8");
  const line = `GOOGLE_DRIVE_REFRESH_TOKEN="${token}"`;
  if (/^GOOGLE_DRIVE_REFRESH_TOKEN=/m.test(raw)) {
    raw = raw.replace(/^GOOGLE_DRIVE_REFRESH_TOKEN=.*$/m, line);
  } else {
    raw = raw.replace(/\s*$/, "") + "\n\n" + line + "\n";
  }
  writeFileSync(ENV_PATH, raw, "utf8");
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

try {
  const env = loadEnv();
  const clientId = env.GOOGLE_CLIENT_ID || "";
  const clientSecret = env.GOOGLE_CLIENT_SECRET || "";
  if (!clientId || !clientSecret) {
    console.error(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not set in .env.\n" +
        "Create an OAuth Client ID (Web application) at console.cloud.google.com\n" +
        "and add them first."
    );
    process.exit(1);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "false",
  });
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  console.log("\n1. Open this link and approve access (sign in with your own Google account):\n");
  console.log(authUrl);
  console.log(
    "\n2. After approving, the browser will try to open a page that won't load.\n" +
      "   Copy the FULL address from the browser bar (it looks like:\n" +
      `   ${REDIRECT_URI}/?code=...&scope=...) and paste it below:\n`
  );

  const pasted = (await rl.question("Paste the full redirect URL: ")).trim();
  const code = new URL(pasted).searchParams.get("code");
  if (!code) {
    console.error("No ?code= found in the pasted URL. Copy the entire address bar contents.");
    process.exit(1);
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    console.error(`Token exchange failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const data = await res.json();
  if (!data.refresh_token) {
    console.error("No refresh_token in the response. Re-run and re-approve (prompt=consent is set).");
    process.exit(1);
  }

  saveRefreshToken(data.refresh_token);
  console.log("\nSaved GOOGLE_DRIVE_REFRESH_TOKEN to .env. You're all set.\n");
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
} finally {
  rl.close();
}