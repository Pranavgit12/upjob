// Browser-level interview integrity monitoring. Events are logged for HR
// review only — they are never used to auto-reject a candidate.

export type IntegrityEventType =
  | "tab_switch"
  | "blur"
  | "camera_disconnected"
  | "mic_disconnected"
  | "candidate_not_visible"
  | "refresh"
  | "multi_face"
  | "interruption";

export type IntegrityMonitor = {
  report: (type: IntegrityEventType, metadata?: Record<string, unknown>) => void;
  stop: () => void;
  setStream: (stream: MediaStream | null) => void;
};

const SEND_URL_PREFIX = "/api/interview/";

export function createIntegrityMonitor(opts: {
  token: string;
  isActive: () => boolean;
  maxIntervalMs?: number;
}): IntegrityMonitor {
  const { token, isActive } = opts;
  const maxInterval = opts.maxIntervalMs ?? 5000;
  let stopped = false;
  let lastTabEvent = 0;
  let lastVisibilityEvent = 0;
  let lastDetection = 0;
  let lastFaceState: "present" | "absent" | "many" | null = null;
  let stream: MediaStream | null = null;
  let videoTrackOnline = true;
  let audioTrackOnline = true;
  let interval: ReturnType<typeof setInterval> | null = null;

  const report = (eventType: IntegrityEventType, metadata?: Record<string, unknown>) => {
    if (stopped || !isActive()) return;
    const payload = {
      events: [{ eventType, metadata: metadata ?? {}, occurredAt: new Date().toISOString() }],
    };
    try {
      void fetch(`${SEND_URL_PREFIX}${encodeURIComponent(token)}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch {
      /* best effort */
    }
  };

  const onBlur = () => {
    // Only report blur if the document is actually hidden (tab switched away),
    // not on every focus loss within the page (clicking buttons, inputs, etc.)
    if (document.hidden) {
      const now = Date.now();
      if (now - lastTabEvent < maxInterval) return;
      lastTabEvent = now;
      report("tab_switch");
    }
  };
  const onVisibility = () => {
    if (document.hidden) {
      const now = Date.now();
      if (now - lastVisibilityEvent < maxInterval) return;
      lastVisibilityEvent = now;
      report("tab_switch");
    }
  };
  const onPageHide = (ev: PageTransitionEvent) => {
    if (!isActive()) return;
    const metadata: Record<string, unknown> = { persisted: ev.persisted };
    report("refresh", metadata);
  };

  // Shape Detection API (Chrome). Optional, best-effort face visibility.
  const maybeDetectFace = async () => {
    if (!stream || !isActive()) return;
    const now = Date.now();
    if (now - lastDetection < 6000) return;
    lastDetection = now;
    const win = window as unknown as { FaceDetector?: new (o?: unknown) => { detect: (v: HTMLVideoElement) => Promise<{ count?: number }[] | { boundingBox?: unknown }[]> } };
    if (!win.FaceDetector) return;
    const video = document.querySelector("video[data-interview-cam]") as HTMLVideoElement | null;
    if (!video || video.readyState < 2) return;
    try {
      const detector = new win.FaceDetector({ fastMode: true, maxDetectedFaces: 10 });
      const faces = await detector.detect(video);
      let state: "present" | "absent" | "many";
      const count = faces.length;
      if (count === 0) state = "absent";
      else if (count > 1) state = "many";
      else state = "present";
      if (state === lastFaceState) return;
      lastFaceState = state;
      if (state === "absent") report("candidate_not_visible", { faces: count });
      else if (state === "many") report("multi_face", { faces: count });
    } catch {
      /* detector unavailable on this page */
    }
  };

  const tick = () => {
    void maybeDetectFace();
    if (!stream) return;
    const vTrack = stream.getVideoTracks()[0];
    const aTrack = stream.getAudioTracks()[0];
    if (vTrack && vTrack.readyState === "ended" && videoTrackOnline) {
      videoTrackOnline = false;
      report("camera_disconnected");
    }
    if (vTrack && vTrack.readyState === "live" && !videoTrackOnline) {
      videoTrackOnline = true;
    }
    if (aTrack && aTrack.readyState === "ended" && audioTrackOnline) {
      audioTrackOnline = false;
      report("mic_disconnected");
    }
    if (aTrack && aTrack.readyState === "live" && !audioTrackOnline) {
      audioTrackOnline = true;
    }
  };

  const setStream = (s: MediaStream | null) => {
    stream = s;
    if (s) {
      videoTrackOnline = s.getVideoTracks()[0]?.readyState !== "ended";
      audioTrackOnline = s.getAudioTracks()[0]?.readyState !== "ended";
    }
  };

  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);
  interval = setInterval(tick, 3000);

  return {
    report,
    stop: () => {
      stopped = true;
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      if (interval) clearInterval(interval);
    },
    setStream,
  };
}