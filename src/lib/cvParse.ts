// Server-side CV file → plain text extraction (PDF / DOCX / DOC).
// All AI/CV secrets stay server-side; the browser only uploads the file.

import path from "path";
import { uploadFile } from "./storage";

/**
 * Single source of truth for the upload ceiling.
 *
 * `NEXT_PUBLIC_MAX_CV_SIZE_MB` is what the browser reads (inlined into the client
 * bundle at build time); `MAX_CV_SIZE_MB` is the server-side knob. Resolving
 * both from one value means an operator can set either and the two tiers always
 * agree. Previously they were independent env vars, which let the client accept
 * a file the server then rejected.
 */
export const MAX_CV_MB =
  Number(process.env.NEXT_PUBLIC_MAX_CV_SIZE_MB) ||
  Number(process.env.MAX_CV_SIZE_MB) ||
  10;

export const MAX_CV_BYTES = MAX_CV_MB * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"];

export function isAcceptedCv(name: string, mime?: string): boolean {
  const ext = path.extname(name).toLowerCase();
  if (ACCEPTED_EXTENSIONS.includes(ext)) return true;
  return Boolean(
    mime &&
      [ "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/octet-stream",
      ].includes(mime.toLowerCase())
  );
}

export function cvMimeType(name: string): string {
  const ext = path.extname(name).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === ".doc") return "application/msword";
  return "application/octet-stream";
}

/** Extract readable text from a CV file buffer. */
export async function extractCvText(fileName: string, buffer: Buffer): Promise<string> {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".pdf") return extractPdf(buffer);
  if (ext === ".docx") return extractDocx(buffer);
  if (ext === ".doc") return extractDoc(buffer);
  // No known extension — sniff by magic bytes.
  const sniffe = sniff(buffer);
  if (sniffe === "pdf") return extractPdf(buffer);
  if (sniffe === "zip") return extractDocx(buffer);
  if (sniffe === "ole") return extractDoc(buffer);
  throw new Error("Unsupported file type. Please upload a PDF, DOC or DOCX file.");
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
  const parsed = await pdfParse(buffer);
  return (parsed?.text ?? "").trim().slice(0, 60000);
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return (result?.value ?? "").trim().slice(0, 60000);
}

async function extractDoc(buffer: Buffer): Promise<string> {
  const WordExtractor = (await import("word-extractor")).default;
  const extractor = new WordExtractor();
  const doc = await extractor.extract(buffer);
  return (doc?.getBody?.() ?? "").trim().slice(0, 60000);
}

function sniff(buffer: Buffer): "pdf" | "zip" | "ole" | "none" {
  if (buffer.length > 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  if (buffer.subarray(0, 4).toString("hex") === "504b0304") return "zip"; // docx (zip)
  if (buffer.subarray(0, 8).toString("hex").toLowerCase().startsWith("d0cf11e0a1b11ae1")) return "ole"; // .doc
  return "none";
}

const CV_PREFIX = "cvs/";

export async function saveCvFile(key: string, buffer: Buffer): Promise<{ key: string; url: string }> {
  const safe = key.replace(/[^a-zA-Z0-9._-]/g, "_");
  const url = `/api/cv/${encodeURIComponent(safe)}/download`;
  const s3Key = `${CV_PREFIX}${safe}`;
  const contentType = cvMimeType(safe);
  await uploadFile(s3Key, buffer, contentType);
  return { key: s3Key, url };
}

export function sanitizeFileKey(fileName: string, id: string): string {
  const ext = path.extname(fileName).toLowerCase() || ".pdf";
  return `${id}${ext}`;
}
