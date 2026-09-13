import {
  uploadFile,
  readFileStream,
} from "./storage";
import { uploadDriveFile, isDriveConfigured } from "./drive";

const RECORDINGS_PREFIX = "interview-recordings/";
const DRIVE_PREFIX = "drive:";

function sanitizeKey(fileName: string): string {
  return `${RECORDINGS_PREFIX}${fileName.replace(/[^\w.-]+/g, "_")}`;
}

export async function saveInterviewRecording(
  fileName: string,
  body: Buffer,
  mimeType = "video/webm"
): Promise<string> {
  if (isDriveConfigured()) {
    const { fileId } = await uploadDriveFile(fileName, body, mimeType);
    return `${DRIVE_PREFIX}${fileId}`;
  }
  const key = sanitizeKey(fileName);
  await uploadFile(key, body, mimeType);
  return key;
}

export async function getInterviewRecording(key: string): Promise<ReadableStream<Uint8Array>> {
  return readFileStream(key);
}
