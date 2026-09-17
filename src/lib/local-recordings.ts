import {
  uploadFile,
  readFileStream,
} from "./storage";

const RECORDINGS_PREFIX = "interview-recordings/";

function sanitizeKey(fileName: string): string {
  return `${RECORDINGS_PREFIX}${fileName.replace(/[^\w.-]+/g, "_")}`;
}

export async function saveInterviewRecording(
  fileName: string,
  body: Buffer,
  mimeType = "video/webm"
): Promise<string> {
  const key = sanitizeKey(fileName);
  await uploadFile(key, body, mimeType);
  return key;
}

// Buffers the request body and uploads it to S3.
export async function saveInterviewRecordingStream(
  fileName: string,
  stream: ReadableStream<Uint8Array>,
  mimeType = "video/webm"
): Promise<string> {
  const body = await streamToBuffer(stream);
  const key = sanitizeKey(fileName);
  await uploadFile(key, body, mimeType);
  return key;
}

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let done = false;
  while (!done) {
    const result = await reader.read();
    done = result.done;
    if (result.value) chunks.push(result.value);
  }
  return Buffer.concat(chunks);
}

export async function getInterviewRecording(key: string): Promise<ReadableStream<Uint8Array>> {
  return readFileStream(key);
}