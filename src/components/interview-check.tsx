"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  ShieldCheck,
  Video,
  Wifi,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDevicePermissions } from "@/hooks/use-device-permissions";

type CheckMeta = {
  status: string;
  jobTitle: string;
  candidateName: string;
  durationMinutes: number;
  minDurationMinutes: number;
  phases: string[];
  recordingConsent: boolean;
  recordingEnabled: boolean;
  hasCv: boolean;
  resumeFileName: string | null;
};

function AudioLevelMeter({ level, muted }: { level: number; muted?: boolean }) {
  const bars = 12;
  return (
    <div className="flex items-end gap-[2px]" style={{ height: 20 }}>
      {Array.from({ length: bars }).map((_, i) => {
        const barThreshold = (i + 1) / bars;
        const active = !muted && level >= barThreshold * 0.8;
        return (
          <div
            key={i}
            className="w-[3px] rounded-full transition-all duration-75"
            style={{
              height: `${Math.max(20 + (i / bars) * 80, 20)}%`,
              backgroundColor: active
                ? i < bars * 0.5
                  ? "#22c55e"
                  : i < bars * 0.8
                    ? "#eab308"
                    : "#ef4444"
                : "rgba(255,255,255,0.15)",
            }}
          />
        );
      })}
    </div>
  );
}

function CameraPreview({
  videoRef,
  stream,
  audioLevel,
  micMuted,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  audioLevel: number;
  micMuted?: boolean;
}) {
  React.useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      void video.play().catch(() => {});
    }
  }, [stream, videoRef]);

  return (
    <div className="relative overflow-hidden rounded-xl bg-zinc-950">
      <video
        ref={videoRef}
        data-check-cam
        playsInline
        muted
        autoPlay
        className="aspect-video w-full object-cover"
      />
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
        <div className="flex items-center gap-1.5 rounded-lg bg-black/60 px-2 py-1 backdrop-blur-sm">
          <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] font-medium text-white/90">Camera</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-black/60 px-2 py-1 backdrop-blur-sm">
          {micMuted ? (
            <MicOff className="h-2.5 w-2.5 text-red-400" />
          ) : (
            <Mic className="h-2.5 w-2.5 text-green-400" />
          )}
          <AudioLevelMeter level={micMuted ? 0 : audioLevel} muted={micMuted} />
        </div>
      </div>
    </div>
  );
}

function PermissionModal({
  isOpen,
  onClose,
  onAllow,
  isRequesting,
  audioLevel,
  bothGranted,
  anyDenied,
  cameraDenied,
  micDenied,
  onRetry,
  onConfirmReady,
  videoRef,
  stream,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAllow: () => void;
  isRequesting: boolean;
  audioLevel: number;
  bothGranted: boolean;
  anyDenied: boolean;
  cameraDenied: boolean;
  micDenied: boolean;
  onRetry: () => void;
  onConfirmReady: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-modal-overlay-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md animate-modal-content-in">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-2xl">
          {bothGranted ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Devices Ready</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Your camera and microphone are working. You&apos;re all set to start your interview.
                </p>
              </div>

              <CameraPreview
                videoRef={videoRef}
                stream={stream}
                audioLevel={audioLevel}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                    <Camera className="h-4 w-4" /> Camera
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                    <Mic className="h-4 w-4" /> Microphone
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Close
                </Button>
                <Button onClick={onConfirmReady} className="flex-1">
                  Start Interview
                </Button>
              </div>
            </div>
          ) : anyDenied ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Permissions Required</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Both camera and microphone access are needed for your AI interview.
                </p>
              </div>

              <div className="space-y-2">
                {cameraDenied && (
                  <div className="rounded-lg bg-red-50 px-3 py-2.5 text-xs leading-relaxed text-red-700">
                    Camera access is required for this interview. Please allow camera access in your
                    browser settings and try again.
                  </div>
                )}
                {micDenied && (
                  <div className="rounded-lg bg-red-50 px-3 py-2.5 text-xs leading-relaxed text-red-700">
                    Microphone access is required for this interview. Please allow microphone access
                    in your browser settings and try again.
                  </div>
                )}
                {cameraDenied && micDenied && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs leading-relaxed text-red-700 font-medium">
                    Both camera and microphone permissions are required to proceed with the interview.
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Not Now
                </Button>
                <Button onClick={onRetry} variant="destructive" className="flex-1">
                  <RefreshCw className="h-4 w-4" />
                  Retry Permissions
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">
                  Camera &amp; Microphone Access Required
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                  To conduct your AI interview, UpJob needs access to your camera and microphone.
                  Both must remain enabled throughout the interview.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2.5">
                  <span className="text-base">📷</span>
                  <span className="text-sm font-medium text-zinc-800">Camera</span>
                  <span className="ml-auto text-xs font-semibold text-zinc-500">— Required</span>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2.5">
                  <span className="text-base">🎙️</span>
                  <span className="text-sm font-medium text-zinc-800">Microphone</span>
                  <span className="ml-auto text-xs font-semibold text-zinc-500">— Required</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Not Now
                </Button>
                <Button
                  onClick={onAllow}
                  disabled={isRequesting}
                  className="flex-1"
                >
                  {isRequesting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Requesting…
                    </>
                  ) : (
                    "Allow Camera & Microphone"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function InterviewCheck({ token }: { token: string }) {
  const router = useRouter();
  const hasFaceDetector = React.useMemo(
    () => typeof window !== "undefined" && "FaceDetector" in window,
    [],
  );
  const [meta, setMeta] = React.useState<CheckMeta | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const modalVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const [faceOk, setFaceOk] = React.useState<"pending" | "ok" | "fail" | "na">(
    hasFaceDetector ? "pending" : "na",
  );
  const [agreed, setAgreed] = React.useState(false);
  const [starting, setStarting] = React.useState(false);
  const startingRef = React.useRef(false);
  const [conflict, setConflict] = React.useState<string | null>(null);
  const [permissionModalOpen, setPermissionModalOpen] = React.useState(false);

  const {
    stream,
    cameraPermission,
    micPermission,
    audioLevel,
    bothGranted,
    anyDenied,
    cameraDenied,
    micDenied,
    isRequesting,
    requestPermissions,
    retryPermissions,
  } = useDevicePermissions();

  React.useEffect(() => {
    fetch(`/api/interview/${token}`, { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Could not load interview");
        setMeta(data);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load"));
  }, [token]);

  const faceTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const stopFaceCheck = React.useCallback(() => {
    if (faceTimerRef.current) {
      clearInterval(faceTimerRef.current);
      faceTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    if (cameraPermission !== "granted" || !hasFaceDetector) return;
    const win = window as unknown as {
      FaceDetector?: new (o?: unknown) => { detect: (v: HTMLVideoElement) => Promise<unknown[]> };
    };
    const FaceDetectorCtor = win.FaceDetector!;
    let attempts = 0;
    const tick = async () => {
      const video = videoRef.current;
      if (!video || !video.videoWidth) return;
      try {
        const detector = new FaceDetectorCtor({ fastMode: true });
        const faces = await detector.detect(video);
        if (faces.length > 0) {
          setFaceOk("ok");
          stopFaceCheck();
        } else if (++attempts >= 25) {
          stopFaceCheck();
        }
      } catch {
        setFaceOk("na");
        stopFaceCheck();
      }
    };
    faceTimerRef.current = setInterval(() => void tick(), 1200);
    return () => stopFaceCheck();
  }, [cameraPermission, stopFaceCheck, hasFaceDetector]);

  const cameraOk = cameraPermission === "granted" && !!stream && stream.getVideoTracks().length > 0;
  const micOk = micPermission === "granted" && !!stream && stream.getAudioTracks().length > 0;

  const handleAllowPermissions = () => {
    void requestPermissions();
  };

  const handleConfirmReady = () => {
    setPermissionModalOpen(false);
  };

  const handleOpenPermissionModal = () => {
    if (bothGranted) {
      setPermissionModalOpen(true);
      return;
    }
    setPermissionModalOpen(true);
  };

  type CheckResult = "pending" | "ok" | "fail" | "na";

  const checks: { label: string; icon: React.ReactNode; status: CheckResult; note?: string }[] = [
    {
      label: "Camera",
      icon: <Camera className="h-4 w-4" />,
      status: cameraOk ? "ok" : cameraPermission === "denied" ? "fail" : "pending",
      note:
        cameraPermission === "idle"
          ? "Click Start to enable"
          : cameraPermission === "denied"
            ? "Blocked — check browser settings"
            : undefined,
    },
    {
      label: "Microphone",
      icon: <Mic className="h-4 w-4" />,
      status: micOk ? "ok" : micPermission === "denied" ? "fail" : "pending",
      note:
        micPermission === "idle"
          ? "Click Start to enable"
          : micPermission === "denied"
            ? "Blocked — check browser settings"
            : undefined,
    },
    {
      label: "Browser permissions",
      icon: <ShieldCheck className="h-4 w-4" />,
      status: cameraOk && micOk ? "ok" : cameraPermission === "denied" ? "fail" : "pending",
    },
    {
      label: "Internet connection",
      icon: <Wifi className="h-4 w-4" />,
      status: meta ? (navigator.onLine ? "ok" : "fail") : "pending",
    },
    {
      label: "Face visibility",
      icon: <Camera className="h-4 w-4" />,
      status: faceOk,
      note: faceOk === "na" ? "Auto-detection unavailable — keep face visible" : undefined,
    },
  ];

  if (loadError) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
        <p className="mt-3 text-sm text-zinc-700">{loadError}</p>
        <Button className="mt-4" onClick={() => router.refresh()}>
          <RefreshCw className="h-4 w-4" />
          Reload
        </Button>
      </div>
    );
  }
  if (!meta) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (meta.status === "COMPLETED") {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-zinc-900">Interview Completed ✓</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Thank you for completing your UpJob AI interview. Your responses have been submitted for
          review. Shortlisting and rejection are decided by our admin team only — expect the
          verdict within 24–48 hours after your interview.
        </p>
        <Link
          href="/dashboard/ai"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!meta.hasCv) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <FileText className="h-7 w-7 text-amber-600" />
        </div>
        <h1 className="mt-4 text-lg font-bold text-zinc-900">Upload your CV to continue</h1>
        <p className="mt-2 text-sm text-zinc-600">
          The AI interviewer personalizes every question from your CV. Add yours first, then come
          right back to start your interview.
        </p>
        <Link
          href={`/dashboard/resume?next=${encodeURIComponent(`/interview/${token}/check`)}`}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          Upload CV
        </Link>
      </div>
    );
  }

  if (meta.status === "IN_PROGRESS") {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
          <Video className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-zinc-900">Resume your interview</h1>
        <p className="mt-2 text-sm text-zinc-600">
          You already started your AI interview for{" "}
          <span className="font-medium text-zinc-800">{meta.jobTitle}</span>. You can pick up where
          you left off.
        </p>
        <Button className="mt-6" onClick={() => void continueInterview()}>
          <Video className="h-4 w-4" />
          Resume Interview
        </Button>
        {conflict && <p className="mt-3 text-xs text-red-600">{conflict}</p>}
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-6 py-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            UpJob AI Interview
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
            Your AI Interview
          </h1>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-zinc-500">
            <Clock className="h-4 w-4" />
            Approximately {meta.durationMinutes} minutes · {meta.jobTitle}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">Before you start</h2>
            <ul className="mt-3 space-y-2 text-sm text-zinc-600">
              {[
                "Camera must remain ON throughout the interview",
                "Microphone must remain ON",
                "Sit in a quiet, well-lit environment",
                "Keep your face visible",
                "Do not use another person for the interview",
                "Answer naturally — pause handling is automatic",
                "Do not refresh or close the browser",
                "Questions may be based on your CV",
                meta.recordingEnabled
                  ? "This interview may be recorded (you must consent below)"
                  : "This interview is not recorded — only your spoken answers are stored as text",
                "Your interview is reviewed by HR before any hiring decision",
              ].map((tip) => (
                <li key={tip} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            {bothGranted ? (
              <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-black shadow-sm">
                <CameraPreview
                  videoRef={videoRef}
                  stream={stream}
                  audioLevel={audioLevel}
                />
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-black shadow-sm">
                <video
                  ref={(el) => {
                    videoRef.current = el;
                  }}
                  data-check-cam
                  playsInline
                  muted
                  autoPlay
                  className="aspect-video w-full object-cover"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/90 px-6 text-center">
                  {isRequesting ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                      <p className="text-xs text-zinc-300">
                        Waiting for camera &amp; microphone access…
                      </p>
                    </>
                  ) : (
                    <>
                      <Button onClick={handleOpenPermissionModal} className="gap-2">
                        <Video className="h-4 w-4" />
                        Enable camera &amp; microphone
                      </Button>
                      {cameraPermission === "denied" && (
                        <p className="max-w-xs text-xs leading-relaxed text-red-300">
                          Access is blocked. Click the 🔒 icon in your address bar, allow camera and
                          microphone for this site, then try again.
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center justify-between bg-zinc-900 px-4 py-2">
                  <span className="text-xs font-medium text-zinc-300">Camera preview</span>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">System Check</h2>
              <ul className="mt-3 space-y-2">
                {checks.map((c) => (
                  <li key={c.label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-zinc-700">
                      {c.icon}
                      {c.label}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {c.note && <span className="text-[11px] text-zinc-400">{c.note}</span>}
                      {c.status === "ok" && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                      {c.status === "pending" && (
                        <Loader2 className="h-4 w-4 animate-spin text-zinc-300" />
                      )}
                      {c.status === "fail" && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      {c.status === "na" && <span className="h-4 w-4" />}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {bothGranted && (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">Device Check</h2>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                    <Camera className="h-4 w-4" /> Camera
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                    <Mic className="h-4 w-4" /> Microphone
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            Privacy &amp; consent
          </h2>
          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 p-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300"
            />
            <span className="text-xs leading-relaxed text-zinc-600">
              I understand that my camera and microphone will be used during the interview, my spoken
              answers will be transcribed and processed by an AI service for evaluation, and the
              resulting transcript and report will be shared with the UpJob HR team strictly for
              recruitment purposes. I agree to the processing of my data for this purpose.{" "}
              <span className="text-blue-600 underline">Read the privacy policy</span>
            </span>
          </label>
          <Button
            className="mt-4 w-full"
            disabled={!agreed || !cameraOk || !micOk || starting}
            onClick={() => void begin()}
          >
            {starting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing…
              </>
            ) : (
              <>
                <Video className="h-4 w-4" />
                Start Interview
              </>
            )}
          </Button>
          {!agreed && (
            <p className="mt-2 text-center text-xs text-zinc-400">
              Agree to the consent notice to continue.
            </p>
          )}
          {!bothGranted && (
            <p className="mt-2 text-center text-xs text-zinc-400">
              Allow camera &amp; microphone access to continue.
            </p>
          )}
        </div>
      </div>

      <PermissionModal
        isOpen={permissionModalOpen}
        onClose={() => setPermissionModalOpen(false)}
        onAllow={handleAllowPermissions}
        isRequesting={isRequesting}
        audioLevel={audioLevel}
        bothGranted={bothGranted}
        anyDenied={anyDenied}
        cameraDenied={cameraDenied}
        micDenied={micDenied}
        onRetry={retryPermissions}
        onConfirmReady={handleConfirmReady}
        videoRef={modalVideoRef}
        stream={stream}
      />
    </>
  );

  async function continueInterview() {
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    setConflict(null);
    try {
      const res = await fetch(`/api/interview/${token}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agreed: true, recordingConsent: meta?.recordingEnabled ?? false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not resume");
      router.push(`/interview/${token}`);
    } catch (err) {
      setConflict(err instanceof Error ? err.message : "Could not resume");
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }

  async function begin() {
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    setConflict(null);
    try {
      const res = await fetch(`/api/interview/${token}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agreed: true, recordingConsent: meta?.recordingEnabled ?? false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start");
      router.push(`/interview/${token}`);
    } catch (err) {
      setConflict(err instanceof Error ? err.message : "Could not start");
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }
}
