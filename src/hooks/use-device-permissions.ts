"use client";

import * as React from "react";

export type DevicePermissionState = "idle" | "requesting" | "granted" | "denied";

let sharedStream: MediaStream | null = null;

export function getActiveDeviceStream(): MediaStream | null {
  return sharedStream?.active ? sharedStream : null;
}

export function stopActiveDeviceStream(): void {
  sharedStream?.getTracks().forEach((track) => track.stop());
  sharedStream = null;
}

export function useDevicePermissions() {
  const [stream, setStream] = React.useState<MediaStream | null>(() => getActiveDeviceStream());
  const [cameraPermission, setCameraPermission] = React.useState<DevicePermissionState>("idle");
  const [micPermission, setMicPermission] = React.useState<DevicePermissionState>("idle");
  const [audioLevel, setAudioLevel] = React.useState(0);
  const animFrameRef = React.useRef<number | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const sourceRef = React.useRef<MediaStreamAudioSourceNode | null>(null);
  const requestRef = React.useRef<Promise<void> | null>(null);

  const cleanupStream = React.useCallback(() => {
    if (animFrameRef.current != null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch {}
      sourceRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    stopActiveDeviceStream();
    setStream(null);
    setAudioLevel(0);
  }, []);

  const startAudioMonitoring = React.useCallback((s: MediaStream) => {
    const audioTracks = s.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(s);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      src.connect(analyser);

      audioCtxRef.current = ctx;
      sourceRef.current = src;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(Math.min(avg / 128, 1));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    } catch {
      /* AudioContext not available — audio level meter will be static */
    }
  }, []);

  React.useEffect(() => {
    return () => {
      if (animFrameRef.current != null) cancelAnimationFrame(animFrameRef.current);
      if (sourceRef.current) try { sourceRef.current.disconnect(); } catch {}
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

  const requestPermissions = React.useCallback(async () => {
    if (getActiveDeviceStream()) {
      const existing = getActiveDeviceStream()!;
      setStream(existing);
      setCameraPermission(existing.getVideoTracks().length > 0 ? "granted" : "denied");
      setMicPermission(existing.getAudioTracks().length > 0 ? "granted" : "denied");
      return;
    }
    if (requestRef.current) return requestRef.current;
    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraPermission("denied");
      setMicPermission("denied");
      return;
    }

    requestRef.current = (async () => {
      setCameraPermission("requesting");
      setMicPermission("requesting");
      try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      sharedStream = s;
      setStream(s);
      setCameraPermission(s.getVideoTracks().length > 0 ? "granted" : "denied");
      setMicPermission(s.getAudioTracks().length > 0 ? "granted" : "denied");
      startAudioMonitoring(s);
      } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setCameraPermission("denied");
        setMicPermission("denied");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setCameraPermission("denied");
        setMicPermission("denied");
      } else {
        setCameraPermission("denied");
        setMicPermission("denied");
      }
      } finally {
        requestRef.current = null;
      }
    })();
    return requestRef.current;
  }, [startAudioMonitoring]);

  const retryPermissions = React.useCallback(() => {
    cleanupStream();
    setCameraPermission("idle");
    setMicPermission("idle");
    setAudioLevel(0);
    void requestPermissions();
  }, [cleanupStream, requestPermissions]);

  return {
    stream,
    cameraPermission,
    micPermission,
    audioLevel,
    bothGranted: cameraPermission === "granted" && micPermission === "granted",
    anyDenied: cameraPermission === "denied" || micPermission === "denied",
    cameraDenied: cameraPermission === "denied",
    micDenied: micPermission === "denied",
    isRequesting: cameraPermission === "requesting" || micPermission === "requesting",
    requestPermissions,
    retryPermissions,
    cleanupStream,
  };
}
