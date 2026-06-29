import { FormEvent, useEffect, useRef, useState } from "react";

function base64ToBlobUrl(base64: string, mimeType = "audio/wav"): string {
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
  return URL.createObjectURL(new Blob([buffer], { type: mimeType }));
}

const SUPPORTS_VOICE =
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof MediaRecorder !== "undefined" &&
  (typeof window === "undefined"
    ? true
    : window.isSecureContext || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

export default function VoiceInterview({
  questionAudio,
  busy,
  onRecorded,
  onTextSubmitted,
}: {
  questionAudio: string | null;
  busy: boolean;
  onRecorded: (blob: Blob) => void;
  onTextSubmitted: (text: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(!SUPPORTS_VOICE);
  const [manualText, setManualText] = useState("");
  const [permissionState, setPermissionState] = useState<"unknown" | "granted" | "denied" | "prompt">("unknown");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!questionAudio) {
      setAudioUrl(null);
      return;
    }
    const url = base64ToBlobUrl(questionAudio);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [questionAudio]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((permission) => {
        setPermissionState(permission.state as "unknown" | "granted" | "denied" | "prompt");
        permission.onchange = () => {
          setPermissionState(permission.state as "unknown" | "granted" | "denied" | "prompt");
        };
      })
      .catch(() => setPermissionState("unknown"));
  }, []);

  async function startRecording() {
    setMicError(null);

    if (!SUPPORTS_VOICE) {
      const reason =
        typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
          ? "Microphone access requires a secure HTTPS connection. Please use the deployed site over HTTPS or open this app on localhost."
          : "This browser does not support microphone recording. Please use text mode instead.";
      setMicError(reason);
      setManualMode(true);
      return;
    }

    if (permissionState === "denied") {
      setMicError("Microphone permission is blocked in this browser. You can continue by typing your answer instead.");
      setManualMode(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        onRecorded(new Blob(chunksRef.current, { type: "audio/webm" }));
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      const errorMessage =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access was denied. You can continue by typing your answer instead."
          : err instanceof DOMException && err.name === "NotFoundError"
            ? "No microphone was found. Please connect one and try again."
            : "Could not start recording. You can continue by typing your answer instead.";
      setMicError(errorMessage);
      setManualMode(true);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function submitManualAnswer(e: FormEvent) {
    e.preventDefault();
    const text = manualText.trim();
    if (!text || busy) return;
    onTextSubmitted(text);
    setManualText("");
    setManualMode(false);
    setMicError(null);
  }

  const fallbackActive = !SUPPORTS_VOICE || manualMode || permissionState === "denied" || Boolean(micError);

  return (
    <div className="mt-6 space-y-3">
      {audioUrl && (
        <audio key={audioUrl} src={audioUrl} autoPlay controls className="w-full" />
      )}

      {fallbackActive ? (
        <form onSubmit={submitManualAnswer} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label className="block text-sm font-medium text-slate-700">
            Type your answer instead of speaking
          </label>
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            rows={4}
            placeholder="Type your answer here…"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            disabled={busy}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={busy || !manualText.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Submit as text"}
            </button>
            {SUPPORTS_VOICE && (
              <button
                type="button"
                onClick={() => {
                  setManualMode(false);
                  setMicError(null);
                }}
                disabled={busy}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Try recording again
              </button>
            )}
          </div>
        </form>
      ) : (
        <>
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={busy}
            className={`w-full rounded-lg px-4 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
              recording ? "bg-red-600 hover:bg-red-500" : "bg-indigo-600 hover:bg-indigo-500"
            }`}
          >
            {busy ? "Transcribing your answer…" : recording ? "Stop recording" : "Record answer"}
          </button>
          <button
            type="button"
            onClick={() => setManualMode(true)}
            disabled={busy}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Type your answer instead
          </button>
        </>
      )}

      {micError && fallbackActive && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{micError}</p>
      )}
    </div>
  );
}
