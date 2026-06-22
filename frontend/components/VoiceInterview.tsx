import { useEffect, useRef, useState } from "react";

function base64ToBlobUrl(base64: string, mimeType = "audio/wav"): string {
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
  return URL.createObjectURL(new Blob([buffer], { type: mimeType }));
}

const SUPPORTS_VOICE =
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof MediaRecorder !== "undefined";

export default function VoiceInterview({
  questionAudio,
  busy,
  onRecorded,
}: {
  questionAudio: string | null;
  busy: boolean;
  onRecorded: (blob: Blob) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
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

  if (!SUPPORTS_VOICE) {
    return (
      <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Your browser doesn&apos;t support microphone recording. Please start a new interview in
        Text mode from the home page.
      </p>
    );
  }

  async function startRecording() {
    setMicError(null);
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
    } catch {
      setMicError("Microphone access was denied. Allow microphone access to record your answer.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <div className="mt-6 space-y-3">
      {audioUrl && (
        <audio key={audioUrl} src={audioUrl} autoPlay controls className="w-full" />
      )}

      <button
        onClick={recording ? stopRecording : startRecording}
        disabled={busy}
        className={`w-full rounded-lg px-4 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
          recording ? "bg-red-600 hover:bg-red-500" : "bg-indigo-600 hover:bg-indigo-500"
        }`}
      >
        {busy ? "Transcribing your answer…" : recording ? "Stop recording" : "Record answer"}
      </button>

      {micError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{micError}</p>
      )}
    </div>
  );
}
