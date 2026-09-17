import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3_ENDPOINT = process.env.S3_ENDPOINT || "";
const S3_BUCKET = process.env.S3_BUCKET || "upjob-uploads";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || "";
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || "";
const S3_REGION = process.env.S3_REGION || "us-east-1";
const UPLOADS_PUBLIC_URL = process.env.UPLOADS_PUBLIC_URL || "";

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;
  if (!S3_ENDPOINT || !S3_ACCESS_KEY || !S3_SECRET_KEY) {
    throw new Error(
      "Cloud storage is not configured. Set S3_ENDPOINT, S3_ACCESS_KEY, and S3_SECRET_KEY in your environment."
    );
  }
  const url = new URL(S3_ENDPOINT);
  const isR2 = url.hostname.includes("r2.cloudflarestorage.com");
  _client = new S3Client({
    region: isR2 ? "auto" : S3_REGION,
    endpoint: S3_ENDPOINT,
    credentials: {
      accessKeyId: S3_ACCESS_KEY,
      secretAccessKey: S3_SECRET_KEY,
    },
    forcePathStyle: !isR2,
  });
  return _client;
}

export function isCloudStorageConfigured(): boolean {
  return Boolean(S3_ENDPOINT && S3_ACCESS_KEY && S3_SECRET_KEY);
}

export interface UploadResult {
  key: string;
  url: string;
}

export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string
): Promise<UploadResult> {
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  const url = UPLOADS_PUBLIC_URL
    ? `${UPLOADS_PUBLIC_URL.replace(/\/+$/, "")}/${key}`
    : "";
  return { key, url };
}

export async function getFileBuffer(key: string): Promise<Buffer> {
  const client = getClient();
  const res = await client.send(
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key })
  );
  const chunks: Uint8Array[] = [];
  const stream = res.Body;
  if (!stream) throw new Error("Empty response from storage");
  const reader = stream.transformToWebStream().getReader();
  let done = false;
  while (!done) {
    const result = await reader.read();
    done = result.done;
    if (result.value) chunks.push(result.value);
  }
  return Buffer.concat(chunks);
}

export async function getFileStream(key: string): Promise<ReadableStream<Uint8Array>> {
  const client = getClient();
  const res = await client.send(
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key })
  );
  const stream = res.Body;
  if (!stream) throw new Error("Empty response from storage");
  return stream.transformToWebStream();
}

export async function fileExists(key: string): Promise<boolean> {
  const client = getClient();
  try {
    await client.send(
      new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key })
    );
    return true;
  } catch {
    return false;
  }
}

export async function deleteFile(key: string): Promise<void> {
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key })
  );
}

export async function getPresignedUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const client = getClient();
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
  return getSignedUrl(client, command, { expiresIn });
}

export async function readFileBuffer(key: string): Promise<Buffer> {
  return getFileBuffer(key);
}

export async function readFileStream(key: string): Promise<ReadableStream<Uint8Array>> {
  return getFileStream(key);
}

export async function deleteStoredFile(key: string): Promise<void> {
  return deleteFile(key);
}
