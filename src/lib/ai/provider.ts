// AI provider abstraction. The interview engine talks to `aiProvider` only, so
// the model/provider can be swapped (OpenAI, Anthropic, etc.) without touching
// the interview logic. Current provider: Google Gemini (via src/lib/gemini.ts,
// key = GEMINI_API_KEY, model = GEMINI_MODEL).

import { geminiJson, geminiText } from "@/lib/gemini";

export interface AiCallOptions {
  system?: string;
  maxTokens?: number;
  temperature?: number;
  schema?: Record<string, unknown>;
}

export interface AiProvider {
  name: string;
  json<T = Record<string, unknown>>(prompt: string, options: AiCallOptions): Promise<T>;
  text(prompt: string, options: AiCallOptions): Promise<string>;
  /** Whether the provider is actually configured with a key/credentials. */
  isConfigured(): boolean;
}

export const aiProvider: AiProvider = {
  name: "gemini",
  json<T>(prompt: string, options: AiCallOptions): Promise<T> {
    return geminiJson<T>(
      prompt,
      options.schema ?? {},
      { system: options.system, maxTokens: options.maxTokens, temperature: options.temperature }
    );
  },
  text(prompt: string, options: AiCallOptions): Promise<string> {
    return geminiText(prompt, {
      system: options.system,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
    });
  },
  isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY);
  },
};