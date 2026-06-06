"use client";

import { useEffect, useRef, useState } from "react";

type CamState = "idle" | "starting" | "on" | "denied" | "unsupported" | "error";

// Real local camera preview for the host console (Issue 003). Degrades cleanly:
// if getUserMedia is unavailable or the user denies access, it shows a fallback
// state without throwing — chat and product controls keep working.
export function CameraPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CamState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setState("idle");
  }

  async function start() {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setState("unsupported");
      return;
    }
    setState("starting");
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setState("on");
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setState("denied");
      } else {
        setState("error");
        setErrorMsg(err instanceof Error ? err.message : "Camera error");
      }
    }
  }

  // Clean up the stream when the component unmounts.
  useEffect(() => () => stop(), []);

  const showVideo = state === "on";

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-neutral-900">
      <video
        ref={videoRef}
        muted
        playsInline
        className={showVideo ? "h-full w-full object-cover" : "hidden"}
      />

      {!showVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          {state === "starting" ? (
            <p className="text-sm text-white/70">Starting camera…</p>
          ) : state === "denied" ? (
            <>
              <span className="text-3xl">🚫</span>
              <p className="mt-2 text-sm font-medium text-white/80">
                Camera access denied
              </p>
              <p className="mt-1 text-xs text-white/50">
                The console still works — chat and product controls are
                unaffected.
              </p>
            </>
          ) : state === "unsupported" ? (
            <>
              <span className="text-3xl">🎥</span>
              <p className="mt-2 text-sm font-medium text-white/80">
                Camera not available in this browser
              </p>
              <p className="mt-1 text-xs text-white/50">
                Using the host preview fallback.
              </p>
            </>
          ) : state === "error" ? (
            <>
              <span className="text-3xl">⚠️</span>
              <p className="mt-2 text-sm font-medium text-white/80">
                Couldn&apos;t start camera
              </p>
              <p className="mt-1 max-w-xs text-xs text-white/50">{errorMsg}</p>
            </>
          ) : (
            <>
              <span className="text-4xl">🎬</span>
              <p className="mt-2 text-sm font-medium text-white/80">
                Host camera preview
              </p>
              <p className="mt-1 text-xs text-white/50">
                Enable your camera to preview the live feed.
              </p>
            </>
          )}
        </div>
      )}

      {showVideo && (
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          PREVIEW
        </span>
      )}

      <div className="absolute bottom-3 right-3 flex gap-2">
        {state === "on" ? (
          <button
            onClick={stop}
            className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-white"
          >
            Stop camera
          </button>
        ) : (
          <button
            onClick={() => void start()}
            disabled={state === "starting"}
            className="rounded-lg bg-shopee px-3 py-1.5 text-xs font-semibold text-white hover:bg-shopee-dark disabled:opacity-50"
          >
            {state === "denied" || state === "error"
              ? "Retry camera"
              : "Enable camera"}
          </button>
        )}
      </div>
    </div>
  );
}
