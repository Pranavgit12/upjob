// Speech-to-text for candidate answers (browser Web Speech API). Swappable
// behind an interface so a server-side STT provider can be substituted later.

export type SttCallbacks = {
  oninterim?: (text: string) => void;
  onfinal: (text: string) => void;
  onerror?: (err: unknown) => void;
  onend?: () => void;
};

export type SttHandle = { stop: () => void; abort: () => void; supported: boolean };

type AnyRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: UnknownEvent) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onend: ((ev: unknown) => void) | null;
};

type UnknownEvent = { resultIndex: number; results: { isFinal: boolean; length: number; [index: number]: { transcript: string } }[] };

function recognitionCtor(): (new () => AnyRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as never as {
    SpeechRecognition?: new () => AnyRecognition;
    webkitSpeechRecognition?: new () => AnyRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const sttSupported = (): boolean => Boolean(recognitionCtor());

/** Start continuous listening. Returns a handle to stop. */
export function startStt(callbacks: SttCallbacks, language = "en-IN"): SttHandle | null {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    callbacks.onerror?.(new Error("Speech recognition is not supported in this browser"));
    return null;
  }
  const rec = new Ctor();
  rec.lang = language;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let finalAccum = "";

  rec.onresult = (ev) => {
    let interim = "";
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i];
      const t = r[0]?.transcript ?? "";
      if (r.isFinal) finalAccum += (finalAccum ? " " : "") + t;
      else interim += t;
    }
    if (interim.trim()) callbacks.oninterim?.(interim);
    if (finalAccum.trim()) callbacks.onfinal?.(finalAccum);
  };

  rec.onerror = (ev) => {
    const err = (ev as unknown as { error?: string })?.error;
    // "no-speech"/"aborted" are expected; treat as quiet pause, not a hard error.
    if (err === "no-speech" || err === "aborted" || err === "network") {
      // keep silent to avoid spamming callers
    } else {
      callbacks.onerror?.(ev);
    }
  };

  rec.onend = () => {
    callbacks.onend?.();
  };

  try {
    rec.start();
  } catch {
    callbacks.onerror?.(new Error("Failed to start speech recognition"));
    return null;
  }

  return {
    supported: true,
    stop: () => {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    },
    abort: () => {
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
    },
  };
}