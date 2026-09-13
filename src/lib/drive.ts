// Server-side Google Drive storage for resumes and interview recordings.
// Two auth modes, never expose secrets to the client:
//   1. OAuth (recommended): GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET plus a
//      GOOGLE_DRIVE_REFRESH_TOKEN obtained from a one-time consent. Files are
//      created in the user's own Google Drive.
//   2. Service account: GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL / PRIVATE_KEY.

import { SignJWT, importPKCS8 } from "jose";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

const OAUTH_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || "").trim();
const OAUTH_CLIENT_SECRET = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
const DRIVE_REFRESH_TOKEN = (process.env.GOOGLE_DRIVE_REFRESH_TOKEN || "").trim();

const SERVICE_ACCOUNT_EMAIL = (process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL || "").trim();
const PRIVATE_KEY = normalizePrivateKey(process.env.GOOGLE_DRIVE_PRIVATE_KEY || "");
const DRIVE_FOLDER_ID = (process.env.GOOGLE_DRIVE_FOLDER_ID || "").trim();

function hasOauthCredentials(): boolean {
  return Boolean(OAUTH_CLIENT_ID && OAUTH_CLIENT_SECRET && DRIVE_REFRESH_TOKEN);
}

function hasServiceAccount(): boolean {
  return Boolean(SERVICE_ACCOUNT_EMAIL && PRIVATE_KEY);
}

export function isDriveConfigured(): boolean {
  return hasOauthCredentials() || hasServiceAccount();
}

function normalizePrivateKey(key: string): string {
  const unescaped = key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
  return unescaped.replace(/^"|"$/g, "").replace(/\\"/g, '"').trim();
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  if (!isDriveConfigured()) {
    throw new Error(
      "Google Drive is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and " +
        "GOOGLE_DRIVE_REFRESH_TOKEN (OAuth), or the GOOGLE_DRIVE_SERVICE_ACCOUNT_* " +
        "credentials (service account)."
    );
  }

  const token = hasOauthCredentials() ? await requestOauthToken() : await requestServiceAccountToken();
  cachedToken = {
    value: token.access_token,
    expiresAt: Date.now() + ((token.expires_in ?? 3600) - 120) * 1000,
  };
  return cachedToken.value;
}

async function requestOauthToken(): Promise<{ access_token: string; expires_in?: number }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
      refresh_token: DRIVE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google Drive OAuth refresh failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as { access_token: string; expires_in?: number };
}

async function requestServiceAccountToken(): Promise<{ access_token: string; expires_in?: number }> {
  const privateKey = await importPKCS8(PRIVATE_KEY, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: DRIVE_FILE_SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setSubject(SERVICE_ACCOUNT_EMAIL)
    .setIssuer(SERVICE_ACCOUNT_EMAIL)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google Drive auth failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as { access_token: string; expires_in?: number };
}

export async function uploadDriveFile(
  fileName: string,
  body: Buffer | Uint8Array,
  mimeType: string
): Promise<{ fileId: string }> {
  const token = await getAccessToken();
  const boundary = `UpJobBoundary-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  const metadata = JSON.stringify({
    name: fileName.slice(0, 255),
    ...(DRIVE_FOLDER_ID ? { parents: [DRIVE_FOLDER_ID] } : {}),
    appProperties: { uploadedBy: "upjob" },
  });
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n\r\n` +
        `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
    ),
    buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const res = await fetch(`${DRIVE_UPLOAD_API}?uploadType=multipart&supportsAllDrives=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: payload,
  });
  if (!res.ok) {
    throw new Error(`Google Drive upload failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { id: string };
  return { fileId: data.id };
}

export async function getDriveFileBuffer(fileId: string): Promise<Buffer> {
  const token = await getAccessToken();
  const res = await fetch(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Google Drive download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function getDriveFileStream(fileId: string): Promise<ReadableStream<Uint8Array>> {
  const token = await getAccessToken();
  const res = await fetch(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok || !res.body) throw new Error(`Google Drive download failed: ${res.status}`);
  return res.body;
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Google Drive delete failed: ${res.status}`);
  }
}