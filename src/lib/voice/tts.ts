// Text-to-speech for the AI interviewer (browser TTS). The provider is swappable
// (e.g. ElevenLabs via a server endpoint) — keep usage behind speakWithTts() so
// the interview room doesn't care which voice engine is behind it.

export type TtsOptions = {
  rate?: number;
  pitch?: number;
  onend?: () => void;
  onerror?: (err: unknown) => void;
};

export const ttsSupported = (): boolean =>
  typeof window !== "undefined" && "speechSynthesis" in window;

let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const preferred = [
    "Microsoft Aria Online (Natural)",
    "Google UK English Female",
    "Microsoft Neerja Online (Natural)",
    "Google US English",
    "en-US",
    "en-GB",
    "en-IN",
  ];
  for (const p of preferred) {
    const found = voices.find((v) => v.name.toLowerCase().includes(p.toLowerCase()));
    if (found) return found;
  }
  return voices.find((v) => v.lang.startsWith("en")) ?? voices[0];
}

function ensureVoice(): SpeechSynthesisVoice | null {
  if (!cachedVoice) cachedVoice = pickVoice();
  return cachedVoice;
}

export function initTts(): void {
  if (!ttsSupported()) return;
  if (!voicesLoaded) {
    voicesLoaded = true;
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoice = pickVoice();
    };
    pickVoice();
  }
}

/** Stop any ongoing speech immediately. */
export function cancelTts(): void {
  if (ttsSupported()) window.speechSynthesis.cancel();
}

/** Speak a line. Returns a promise that resolves when speech ends (or errors). */
export function speakWithTts(text: string, options: TtsOptions = {}): Promise<void> {
  if (!ttsSupported()) {
    queueMicrotask(() => options.onend?.());
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = ensureVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = options.rate ?? 1.08;
    utterance.pitch = options.pitch ?? 1.02;
    utterance.lang = voice?.lang ?? "en-US";
    utterance.onend = () => {
      options.onend?.();
      resolve();
    };
    utterance.onerror = (ev) => {
      if (ev.error === "interrupted" || ev.error === "canceled") {
        resolve();
        return;
      }
      options.onerror?.(ev);
      resolve();
    };
    synth.speak(utterance);
  });
}