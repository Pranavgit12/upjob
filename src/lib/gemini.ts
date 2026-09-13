const API_KEY = process.env.GEMINI_API_KEY || "";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const BASE = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(API_KEY)}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

interface CallOptions {
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function geminiText(prompt: string, options: CallOptions = {}): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(BASE(GEMINI_MODEL), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: options.system ? { parts: [{ text: options.system }] } : undefined,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: options.maxTokens ?? 1024,
          temperature: options.temperature ?? 0.7,
        },
      }),
    });

    const body = (await res.json()) as GeminiResponse;

    if (!res.ok) {
      if (res.status === 503 || res.status === 429) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      const message =
        body?.error?.message ||
        `Gemini request failed with status ${res.status}`;
      throw new Error(message);
    }

    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text === "string") {
      return stripMarkdownFences(text).trim();
    }
    throw new Error("Gemini returned no text content");
  }
  throw new Error("Gemini request failed: retries exhausted");
}

export async function geminiJson<T = Record<string, unknown>>(
  prompt: string,
  schema: Record<string, unknown>,
  options: CallOptions = {}
): Promise<T> {
  let lastError: unknown = new Error("no attempts");
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(BASE(GEMINI_MODEL), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: options.system ? { parts: [{ text: options.system }] } : undefined,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema,
            maxOutputTokens: options.maxTokens ?? 2048,
            temperature: options.temperature ?? 0.4,
          },
        }),
      });

      const body = (await res.json()) as GeminiResponse;

        if (!res.ok) {
          if (res.status === 503 || res.status === 429) {
            await sleep(1500 * (attempt + 1));
            continue;
          }
        throw new Error(
          (body?.error?.message as string) || `Gemini request failed with status ${res.status}`
        );
      }

      const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text === "string") {
        return parseJsonLoose<T>(text);
      }
      throw new Error("Gemini returned no JSON content");
    } catch (err) {
      lastError = err;
      await sleep(600 * (attempt + 1));
    }
  }
  throw lastError;
}

function stripMarkdownFences(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return match ? match[1] : text;
}

function parseJsonLoose<T>(text: string): T {
  const cleaned = stripMarkdownFences(text).trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      /* fall through */
    }
  }
  return JSON.parse(cleaned) as T;
}