"use client";

import { useEffect, useRef, useState } from "react";

// Minimal Web Speech API typings (not in the standard TS lib).
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type MicState = "idle" | "listening" | "unsupported" | "denied" | "error";

// Host microphone (host-microphone feature). Uses the browser Web Speech API to
// transcribe the seller's speech and posts each finalized utterance to the
// Stream Producer DeepAgent. Degrades cleanly when unsupported or denied.
// Optional callbacks let a parent (e.g. the live transcript panel) mirror the
// in-progress interim text and listening state.
export function HostMic({
  roomId,
  onInterimChange,
  onListeningChange,
}: {
  roomId: string;
  onInterimChange?: (interim: string) => void;
  onListeningChange?: (listening: boolean) => void;
}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const listeningRef = useRef(false); // desired state, for auto-restart
  const [state, setState] = useState<MicState>("idle");
  const [lastHeard, setLastHeard] = useState("");
  const [interim, setInterim] = useState("");

  useEffect(() => {
    // Stop recognition if the component unmounts.
    return () => {
      listeningRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  // Mirror interim text + listening state to an optional parent.
  useEffect(() => {
    onInterimChange?.(interim);
  }, [interim, onInterimChange]);
  useEffect(() => {
    onListeningChange?.(state === "listening");
  }, [state, onListeningChange]);

  async function sendTranscript(transcript: string) {
    const text = transcript.trim();
    if (!text) return;
    setLastHeard(text);
    try {
      await fetch("/api/host-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, transcript: text }),
      });
    } catch {
      // Best-effort; a dropped segment isn't fatal for the demo.
    }
  }

  function start() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setState("unsupported");
      return;
    }
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          void sendTranscript(transcript);
          setInterim("");
        } else {
          interimText += transcript;
        }
      }
      if (interimText) setInterim(interimText);
    };

    recognition.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        listeningRef.current = false;
        setState("denied");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        setState("error");
      }
    };

    recognition.onend = () => {
      // The API stops periodically; restart while the host wants to listen.
      if (listeningRef.current) {
        try {
          recognition.start();
        } catch {
          /* already started */
        }
      } else {
        setState("idle");
      }
    };

    recognitionRef.current = recognition;
    listeningRef.current = true;
    try {
      recognition.start();
      setState("listening");
    } catch {
      setState("error");
    }
  }

  function stop() {
    listeningRef.current = false;
    recognitionRef.current?.stop();
    setState("idle");
    setInterim("");
  }

  const listening = state === "listening";

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
          <span>🎙️</span>
          Host mic
          {listening && (
            <span className="ml-1 inline-flex h-2 w-2 animate-pulse rounded-full bg-red-500" />
          )}
        </h3>
        {listening ? (
          <button
            onClick={stop}
            className="rounded-lg bg-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-300"
          >
            Stop listening
          </button>
        ) : (
          <button
            onClick={start}
            disabled={state === "unsupported"}
            className="rounded-lg bg-shopee px-3 py-1.5 text-xs font-semibold text-white hover:bg-shopee-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state === "denied" || state === "error"
              ? "Retry mic"
              : "Start listening"}
          </button>
        )}
      </div>

      <p className="mt-2 text-xs text-neutral-400">
        {state === "unsupported"
          ? "Speech recognition isn't supported in this browser (try Chrome or Edge)."
          : state === "denied"
            ? "Mic access denied. The console still works without it."
            : state === "error"
              ? "Mic error — click retry."
              : listening
                ? "Listening… the AI learns context and flags false claims."
                : "Turn on to let the AI learn from what you say live."}
      </p>

      {(interim || lastHeard) && (
        <div className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs">
          {interim ? (
            <span className="text-neutral-400">{interim}…</span>
          ) : (
            <span className="text-neutral-600">Last: “{lastHeard}”</span>
          )}
        </div>
      )}
    </section>
  );
}
