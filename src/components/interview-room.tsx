"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  Loader2,
  Mic,
  MicOff,
  Send,
  Video,
  VideoOff,
  Volume2,
  WifiOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { speakWithTts, cancelTts, initTts, ttsSupported } from "@/lib/voice/tts";
import { startStt, type SttHandle } from "@/lib/voice/stt";
import { createIntegrityMonitor, type IntegrityMonitor } from "@/lib/voice/integrity";
import { getActiveDeviceStream, stopActiveDeviceStream } from "@/hooks/use-device-permissions";

type RoomMeta = {
  status: string;
  jobTitle: string;
  companyName: string;
  candidateName: string;
  durationMinutes: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  phases: string[];
  elapsedSeconds: number | null;
  remainingSeconds: number | null;
  startedAt: string | null;
  process: string;
  consentAccepted: boolean;
  recordingEnabled: boolean;
  hasCv: boolean;
  interviewer: { name: string; image: string | null; description: string | null; voiceHint: string | null } | null;
  questionPlan?: { questionId: string; question: string }[];
};

type Turn = {
  questionId: string;
  question: string;
  answer: string;
  interim?: string;
  speaking?: boolean;
};

export function InterviewRoom({ token }: { token: string }) {
  const router = useRouter();
  const [meta, setMeta] = React.useState<RoomMeta | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false); // camera/mic acquired
  const [camOn, setCamOn] = React.useState(true);
  const [micOn, setMicOn] = React.useState(true);
  const [online, setOnline] = React.useState(true);
  const [lastQuestion, setLastQuestion] = React.useState("");
  const [interim, setInterim] = React.useState("");
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [phase, setPhase] = React.useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [questionCount, setQuestionCount] = React.useState(8);
  const [state, setState] = React.useState<"idle" | "speaking" | "listening" | "processing" | "complete" | "error">("idle");
  const [elapsed, setElapsed] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [finalMsg, setFinalMsg] = React.useState("");
  const [confirmAction, setConfirmAction] = React.useState<"skip" | "end" | null>(null);
  const [rateLimited, setRateLimited] = React.useState(false);
  const finishingRef = React.useRef(false);
  const submittingRef = React.useRef(false);
  const mediaRequestRef = React.useRef<Promise<boolean> | null>(null);
  const interviewStartRef = React.useRef(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const requestIdRef = React.useRef<string | null>(null);
  const requestStatusRef = React.useRef<"idle" | "processing" | "completed" | "error">("idle");
  const speechGenerationRef = React.useRef(0);
  const questionIdRef = React.useRef("question-0");
  const questionTextRef = React.useRef("");
  const ttsCacheRef = React.useRef(new Map<string, string>());
  const prefetchedQuestionsRef = React.useRef(new Map<string, string>());

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const recordingChunksRef = React.useRef<Blob[]>([]);
  const sttRef = React.useRef<SttHandle | null>(null);
  const integrityRef = React.useRef<IntegrityMonitor | null>(null);
  const answerStartedAt = React.useRef<number>(0);
  const listeningRef = React.useRef(false);
  const finalTranscriptRef = React.useRef("");
  const silenceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const noSpeechTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const sttRestartTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionIndexRef = React.useRef(0);

  React.useEffect(() => {
    questionIndexRef.current = questionIndex;
  }, [questionIndex]);

  // Bind the camera stream to the video element only when the element first
  // becomes available or the stream changes — never on re-render.
  React.useEffect(() => {
    const el = videoRef.current;
    const stream = streamRef.current;
    if (el && stream && el.srcObject !== stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    }
  });

  React.useEffect(() => {
    initTts();
    let cancelled = false;
    fetch(`/api/interview/${token}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Could not load interview");
        if (cancelled) return;
        setMeta(d);
        if (d.status === "INVITED") {
          router.replace(`/interview/${token}/check`);
        } else if (d.status === "COMPLETED") {
          setState("complete");
        } else {
          const planQuestion = d.questionPlan?.[d.currentStep ?? 0];
          const welcome = planQuestion?.question
            ?? `Welcome, ${d.candidateName?.split(" ")[0] ?? "there"}! I'm your AI interviewer for ${d.jobTitle}. Let me run through a few things with you.`;
          questionIdRef.current = String(planQuestion?.questionId ?? `question-${(d.currentStep ?? 0) + 1}`);
          questionTextRef.current = welcome;
          setLastQuestion(welcome);
          setPhase(d.phases?.[0] ?? null);
          setQuestionCount(d.maxSteps ?? d.questionCount ?? 10);
          for (const question of d.questionPlan ?? []) {
            if (question.questionId && question.question) {
              prefetchedQuestionsRef.current.set(question.questionId, question.question);
            }
          }
          if (typeof d.elapsedSeconds === "number") setElapsed(d.elapsedSeconds);
        }
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load"));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch only on mount; router is stable
  }, [token]);

  React.useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(timer);
    };
  }, []);

  // Cleanup pending requests and timers on unmount
  React.useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      submittingRef.current = false;
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      if (noSpeechTimer.current) clearTimeout(noSpeechTimer.current);
      if (sttRestartTimer.current) clearTimeout(sttRestartTimer.current);
      cancelTts();
      speechGenerationRef.current += 1;
      try { sttRef.current?.stop(); } catch { /* noop */ }
    };
  }, []);

  const handleVideoRef = React.useCallback((el: HTMLVideoElement | null) => {
    if (el) {
      videoRef.current = el;
      if (el.srcObject !== streamRef.current) {
        el.srcObject = streamRef.current;
      }
      el.play().catch(() => {});
    } else {
      videoRef.current = null;
    }
  }, []);

  const requestMedia = async () => {
    const existingStream = streamRef.current ?? getActiveDeviceStream();
    if (existingStream?.active) {
      streamRef.current = existingStream;
      setReady(true);
      return true;
    }
    if (mediaRequestRef.current) return mediaRequestRef.current;
    mediaRequestRef.current = (async () => {
      try {
      const s = await (getActiveDeviceStream() ?? navigator.mediaDevices.getUserMedia({
        video: true,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      }));
      streamRef.current = s;
      if (videoRef.current && videoRef.current.srcObject !== s) {
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => {});
      }
      if (meta?.recordingEnabled && "MediaRecorder" in window) {
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : "video/webm";
        const recorder = new MediaRecorder(s, { mimeType });
        recordingChunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) recordingChunksRef.current.push(event.data);
        };
        recorder.start(1000);
        recorderRef.current = recorder;
      }
      integrityRef.current?.setStream(s);
      setCamOn(true);
      setMicOn(true);
      setReady(true);
      return true;
      } catch {
      setError("Camera/microphone access is required for this interview. Please allow access and retry.");
      return false;
      } finally {
        mediaRequestRef.current = null;
      }
    })();
    return mediaRequestRef.current;
  };

  const handleStart = async () => {
    if (interviewStartRef.current || state !== "idle") return;
    interviewStartRef.current = true;
    setError(null);
    const ok = await requestMedia();
    if (!ok) {
      interviewStartRef.current = false;
      return;
    }
    integrityRef.current = createIntegrityMonitor({ token, isActive: () => listeningRef.current });
    integrityRef.current.setStream(streamRef.current);
    setState("speaking");
    await speakQuestion(lastQuestion);
  };

  const speakQuestion = async (text: string) => {
    const speechGeneration = ++speechGenerationRef.current;
    const questionId = questionIdRef.current;
    questionTextRef.current = text;
    setLastQuestion(text);
    if (!ttsSupported()) {
      // No TTS — still move to listening so the interview works.
      if (speechGeneration !== speechGenerationRef.current) return;
      setState("listening");
      startListening();
      return;
    }
    await speakWithTts(ttsCacheRef.current.get(questionId) ?? text, {
      onend: () => {
        if (speechGeneration !== speechGenerationRef.current) return;
        setState("listening");
        startListening();
      },
      onerror: () => {
        if (speechGeneration !== speechGenerationRef.current) return;
        setState("listening");
        startListening();
      },
    });
  };

  const startListening = () => {
    if (listeningRef.current) return;
    const nextPlanned = meta?.questionPlan?.[questionIndexRef.current + 1];
    if (nextPlanned && !prefetchedQuestionsRef.current.has(nextPlanned.questionId)) {
      prefetchedQuestionsRef.current.set(nextPlanned.questionId, nextPlanned.question);
      ttsCacheRef.current.set(nextPlanned.questionId, nextPlanned.question);
    }
    listeningRef.current = true;
    finalTranscriptRef.current = "";
    setInterim("");
    // eslint-disable-next-line react-hooks/purity -- browser wall-clock timing outside render
    answerStartedAt.current = Date.now();
    const launch = () => {
      if (!listeningRef.current) return;
      const h = startStt({
        oninterim: (t) => {
          setInterim(t);
          resetSilenceTimer();
        },
        onfinal: (t) => {
          finalTranscriptRef.current = t;
          resetSilenceTimer();
        },
        onerror: () => {},
        onend: () => {
          // Chrome stops SpeechRecognition periodically — restart if still listening
          if (listeningRef.current) {
            sttRef.current = null;
            if (sttRestartTimer.current) clearTimeout(sttRestartTimer.current);
            sttRestartTimer.current = setTimeout(launch, 200);
          }
        },
      });
      sttRef.current = h;
      if (h && !h.supported) {
        listeningRef.current = false;
      }
    };
    launch();
    // If the candidate never speaks, keep the interview moving.
    noSpeechTimer.current = setTimeout(() => {
      if (listeningRef.current) void submitCurrentAnswer();
    }, 45000);
  };

  const resetSilenceTimer = () => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    silenceTimer.current = setTimeout(() => {
      void submitCurrentAnswer();
    }, 3000);
  };

  const stopListening = () => {
    listeningRef.current = false;
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
    if (noSpeechTimer.current) {
      clearTimeout(noSpeechTimer.current);
      noSpeechTimer.current = null;
    }
    try {
      sttRef.current?.stop();
    } catch {
      /* noop */
    }
    sttRef.current = null;
  };

  const cancelPendingRequest = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

  const submitCurrentAnswer = async () => {
    if (submittingRef.current || requestStatusRef.current === "processing") return;
    submittingRef.current = true;
    stopListening();
    const transcript = finalTranscriptRef.current.trim() || interim.trim();
    // eslint-disable-next-line react-hooks/purity -- browser wall-clock timing outside render
    const durationSeconds = Math.round((Date.now() - answerStartedAt.current) / 1000);
    setState("processing");
    setRateLimited(false);
    const q = questionTextRef.current || lastQuestion;
    const questionId = questionIdRef.current;
    const reqId = `${questionId}-${crypto.randomUUID()}`;
    requestIdRef.current = reqId;
    setTurns((prev) =>
      prev.some((turn) => turn.questionId === questionId)
        ? prev
        : [...prev, { questionId, question: q, answer: transcript || "(no audible answer)" }],
    );
    const controller = new AbortController();
    abortRef.current = controller;
    requestStatusRef.current = "processing";
    try {
      const res = await fetch(`/api/interview/${token}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          durationSeconds,
          questionIndex: questionIndexRef.current + 1,
          questionId,
          requestId: reqId,
        }),
        signal: controller.signal,
      });
      if (reqId !== requestIdRef.current) return;
      if (res.status === 429) {
        setRateLimited(true);
        setError("The interview service is temporarily busy. Please wait a moment.");
        setState("error");
        setLastQuestion(q);
        requestStatusRef.current = "error";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not process your answer");
      setInterim("");
      if (data.phase && meta?.phases?.includes(data.phase)) setPhase(data.phase);
      const nextQuestionIndex = data.questionIndex ?? questionIndex + 1;
      questionIndexRef.current = nextQuestionIndex;
      setQuestionIndex(nextQuestionIndex);
      setQuestionCount(data.questionCount ?? questionCount);
      if (data.isComplete) {
        await finishInterview();
        return;
      }
      questionIdRef.current = String(data.questionId ?? `question-${(data.questionIndex ?? questionIndex + 1) + 1}`);
      ttsCacheRef.current.set(questionIdRef.current, String(data.speech));
      setState("speaking");
      requestStatusRef.current = "completed";
      await speakQuestion(data.speech);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Could not process your answer";
      setError(message);
      setState("error");
      setLastQuestion(q);
      requestStatusRef.current = "error";
    } finally {
      if (reqId === requestIdRef.current) {
        submittingRef.current = false;
        abortRef.current = null;
      }
    }
  };

  const uploadRecording = React.useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    await new Promise<void>((resolve) => {
      recorder.addEventListener("stop", () => resolve(), { once: true });
      recorder.stop();
    });
    recorderRef.current = null;
    const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "video/webm" });
    if (!blob.size) return;
    const response = await fetch(`/api/interview/${token}/recording`, {
      method: "POST",
      headers: { "Content-Type": blob.type },
      body: blob,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || "Could not save interview video");
    }
  }, [token]);

  const finishInterview = React.useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    try {
      await uploadRecording();
      const res = await fetch(`/api/interview/${token}/complete`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not finalize interview");
      setFinalMsg(data.message || "Your interview has been submitted for HR review.");
      setState("complete");
      integrityRef.current?.stop();
      stopActiveDeviceStream();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finalize interview");
      setState("error");
    }
  }, [token, uploadRecording]);

  React.useEffect(() => {
    if (!meta || state === "complete") return;
    if (elapsed >= meta.durationMinutes * 60) void finishInterview();
  }, [elapsed, meta, state, finishInterview]);

  const toggleCam = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !track.enabled;
    track.enabled = next;
    setCamOn(next);
  };
  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    const next = !track.enabled;
    track.enabled = next;
    setMicOn(next);
  };

  const replayQuestion = () => {
    cancelTts();
    void speakQuestion(lastQuestion);
  };

  const skipAnswer = () => {
    setConfirmAction("skip");
  };

  const endInterview = () => setConfirmAction("end");

  const retryQuestion = () => {
    setError(null);
    setRateLimited(false);
    cancelPendingRequest();
    requestIdRef.current = null;
    requestStatusRef.current = "idle";
    submittingRef.current = false;
    void submitCurrentAnswer();
  };

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
          <p className="mt-3 text-sm text-zinc-400">{loadError}</p>
          <Button
            className="mt-4 bg-white text-black hover:bg-zinc-200"
            onClick={() => {
              setLoadError(null);
              setMeta(null);
              void fetch(`/api/interview/${token}`, { cache: "no-store" })
                .then(async (r) => {
                  const d = await r.json();
                  if (!r.ok) throw new Error(d.error || "Could not load interview");
                  setMeta(d);
                  if (d.status === "INVITED") {
                    router.replace(`/interview/${token}/check`);
                  } else if (d.status === "COMPLETED") {
                    setState("complete");
                  } else {
                    setLastQuestion(`Welcome, ${d.candidateName?.split(" ")[0] ?? "there"}! I'm your AI interviewer for ${d.jobTitle}. Let me run through a few things with you.`);
                    setPhase(d.phases?.[0] ?? null);
                    setQuestionCount(d.maxSteps ?? d.questionCount ?? 8);
                    if (typeof d.elapsedSeconds === "number") setElapsed(d.elapsedSeconds);
                  }
                })
                .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load"));
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
      </div>
    );
  }

  if (state === "complete") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">Interview Completed ✓</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Thank you for completing your UpJob AI interview.{" "}
            {finalMsg || "Your responses have been successfully submitted."}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Shortlisting and rejection are decided by our admin team only — expect the verdict
            within 24–48 hours after your interview.
          </p>
          <Link
            href="/dashboard/ai"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const remaining = Math.max(0, (meta.durationMinutes * 60 - elapsed));
  const progress = Math.min(100, Math.round((elapsed / (meta.durationMinutes * 60)) * 100));
  const phaseLabel = phase ?? "Introduction";
  const turnCount = turns.length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950 text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold">
            Up<span className="text-blue-500">Job</span>
          </span>
          <span className="hidden h-4 w-px bg-white/15 sm:block" />
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-zinc-200">Interview: {meta.jobTitle}</p>
            <p className="text-[11px] text-zinc-500">{meta.companyName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 md:flex">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            <span className="text-xs text-zinc-300">Interview Progress</span>
          </div>
          {camOn && state === "listening" && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="text-xs font-medium text-red-400">REC</span>
            </span>
          )}
          <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5">
            <Clock className="h-3.5 w-3.5 text-zinc-400" />
            <span className={`text-xs font-medium tabular-nums ${remaining < 300 ? "text-amber-400" : remaining < 90 ? "text-red-400" : "text-zinc-200"}`}>
              {fmt(remaining)}
            </span>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 lg:flex-row">
        {/* Candidate camera — main area */}
        <div className="flex flex-1 flex-col gap-3">
          <div className="relative h-56 min-h-[200px] overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-white/10 sm:h-72 lg:h-[400px]">
            {!ready ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                  <Camera className="h-8 w-8 text-zinc-300" />
                </div>
                <p className="max-w-xs text-sm text-zinc-400">
                  Turn on your camera and microphone to start the interview.
                </p>
                <Button onClick={() => void handleStart()} className="mt-2 bg-indigo-600 hover:bg-indigo-500" disabled={state === "processing"}>
                  <Video className="h-4 w-4" />
                  Start with camera & mic
                </Button>
                {error && (
                  <p className="flex items-center gap-1.5 text-xs text-red-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {error}
                  </p>
                )}
              </div>
            ) : (
              <>
                <video
                  ref={handleVideoRef}
                  data-interview-cam
                  playsInline
                  autoPlay
                  muted
                  className="h-full w-full object-cover"
                />
                <div className="absolute left-3 top-3 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-zinc-200 backdrop-blur">
                    <Video className="h-3.5 w-3.5" />
                    {camOn ? "You" : "Camera off"}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-zinc-200 backdrop-blur">
                    {online ? <WifiOnline /> : <WifiOff className="h-3.5 w-3.5 text-red-400" />}
                    {online ? "Connected" : "Offline"}
                  </span>
                  <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur ${micOn ? "bg-black/60 text-zinc-200" : "bg-red-500/80 text-white"}`}>
                    {micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                    {micOn ? "Mic on" : "Muted"}
                  </span>
                </div>
                <div className="absolute right-3 top-3 flex flex-col gap-2">
                  <button
                    onClick={toggleCam}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 backdrop-blur transition-colors hover:bg-black/80"
                    aria-label={camOn ? "Turn camera off" : "Turn camera on"}
                  >
                    {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={toggleMic}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 backdrop-blur transition-colors hover:bg-black/80"
                    aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
                  >
                    {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl bg-white/5 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {state === "speaking" ? "AI interviewer is speaking…" : state === "listening" ? "Listening to you — keep speaking" : state === "processing" ? "Evaluating response…" : "Awaiting start"}
            </p>
            <p className="mt-1 min-h-[2rem] text-sm text-zinc-100">
              {state === "processing" && (
                <span className="inline-flex items-center gap-2 text-blue-300">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Evaluating response…
                </span>
              )}
              {state === "listening" && interim ? <span className="text-blue-300">{interim}</span> : lastQuestion}
            </p>
          </div>
        </div>

        {/* AI interviewer panel */}
        <aside className="w-full min-h-0 shrink overflow-y-auto rounded-2xl bg-zinc-900 p-5 ring-1 ring-white/10 lg:w-[340px]">
          <div className="flex items-start gap-3">
            {meta.interviewer?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={meta.interviewer.image}
                alt={meta.interviewer.name}
                className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-indigo-500/50"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-sm font-bold">
                {avatarInitials(meta.interviewer?.name ?? meta.companyName)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold">{meta.interviewer?.name ?? "UpJob AI Interviewer"}</p>
              <p className="text-xs text-zinc-500">{meta.interviewer?.description ?? meta.jobTitle}</p>
            </div>
            <span className="ml-auto flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-zinc-400">
              <Volume2 className="h-3.5 w-3.5" />
              1-1
            </span>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-[11px] text-zinc-500">
              <span className="font-medium uppercase tracking-wide">Interview progress</span>
              <span className="tabular-nums">{Math.min(100, Math.round(progress))}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-500">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-[10px]">●</span>
              {phaseLabel}
              <span className="text-zinc-600"> · Question {Math.min(turnCount + 1, questionCount)}/{questionCount}</span>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Phases</p>
            </div>
            <ul className="mt-2 space-y-1.5">
              {(meta.phases?.length ? meta.phases : []).map((p) => {
                const idx = p === phaseLabel;
                return (
                  <li key={p} className={`flex items-center gap-2 text-xs ${idx ? "text-indigo-300" : "text-zinc-500"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${idx ? "bg-indigo-400" : "bg-white/15"}`} />
                    {p}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-5 rounded-xl bg-white/5 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">What to know</p>
            <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-zinc-400">
              <li>• Answer in full sentences — I transcribe you in real time.</li>
              <li>• Pause briefly when done; I&apos;ll move on automatically.</li>
              <li>• Use “Done answering” to finish your current answer early.</li>
              <li>• Don&apos;t close or refresh this tab.</li>
            </ul>
          </div>
        </aside>
      </main>

      {/* Bottom controls */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-zinc-950 px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className={`flex items-center gap-1.5 ${camOn ? "text-emerald-400" : "text-red-400"}`}>
            <Camera className="h-3.5 w-3.5" /> {camOn ? "Camera on" : "Camera off"}
          </span>
          <span className="text-zinc-700">|</span>
          <span className={`flex items-center gap-1.5 ${micOn ? "text-emerald-400" : "text-red-400"}`}>
            <Mic className="h-3.5 w-3.5" /> {micOn ? "Microphone on" : "Microphone off"}
          </span>
          <span className="text-zinc-700">|</span>
          <span className={`flex items-center gap-1.5 ${online ? "text-emerald-400" : "text-red-400"}`}>
            {online ? <WifiOnline /> : <WifiOff className="h-3.5 w-3.5" />} {online ? "Connected" : "Offline"}
          </span>
        </div>

        {ready && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/10 text-white hover:bg-white/20"
              onClick={replayQuestion}
              disabled={state === "processing" || state === "listening"}
            >
              <Volume2 className="h-4 w-4" />
              Replay question
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/10 text-white hover:bg-white/20"
              onClick={skipAnswer}
              disabled={state === "processing" || state === "idle"}
            >
              <Send className="h-4 w-4" />
              Done answering
            </Button>
            <Button
              size="sm"
              className="bg-white text-black hover:bg-zinc-200"
              onClick={endInterview}
              disabled={state === "processing"}
            >
              Submit & finish
            </Button>
          </div>
        )}
      </footer>

      {/* Error toast */}
      {error && (
        <div className={`fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg ${rateLimited ? "bg-amber-500/90 text-white" : "bg-red-500/90 text-white"}`}>
          {rateLimited ? <Clock className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {error}
          <button
            onClick={retryQuestion}
            className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold hover:bg-white/30"
          >
            {rateLimited ? "Retry" : "Retry"}
          </button>
          <button onClick={() => { setError(null); setRateLimited(false); }} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 p-6 ring-1 ring-white/10">
            <h3 className="text-lg font-semibold text-white">
              {confirmAction === "end" ? "Finish the interview?" : "Skip this question?"}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {confirmAction === "end"
                ? "You'll submit your answers so far for HR review. You can't continue after this."
                : "We'll move to the next question without recording an answer for this one."}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" className="bg-white/10 text-white hover:bg-white/20" onClick={() => setConfirmAction(null)}>
                Continue interview
              </Button>
              <Button
                className="bg-red-500 text-white hover:bg-red-400"
                disabled={state === "processing"}
                onClick={() => {
                  const action = confirmAction;
                  setConfirmAction(null);
                  if (action === "skip") void submitCurrentAnswer();
                  else void finishInterview();
                }}
              >
                {confirmAction === "end" ? "Finish now" : "Skip & continue"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function avatarInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function WifiOnline() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" x2="12.01" y1="20" y2="20" />
    </svg>
  );
}