import { useRouter } from "next/router";
import { FormEvent, useEffect, useRef, useState } from "react";
import Layout from "@/components/Layout";
import {
  completeInterview,
  errorMessage,
  getInterview,
  Interview,
  sendAnswer,
} from "@/lib/api";

const TOTAL_QUESTIONS = 5;

export default function InterviewPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : null;

  const [interview, setInterview] = useState<Interview | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    getInterview(id)
      .then((iv) => {
        if (iv.status === "completed") router.replace(`/results/${id}`);
        else setInterview(iv);
      })
      .catch((err) => setError(errorMessage(err)));
  // router is a stable singleton in Next.js Pages Router — omitting it prevents
  // React Strict Mode from double-firing this fetch on every render cycle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [interview?.messages.length]);

  const messages = interview?.messages ?? [];
  const answered = messages.filter((m) => m.role === "user").length;
  const allAnswered = answered >= TOTAL_QUESTIONS;
  const awaitingAnswer = !allAnswered && messages[messages.length - 1]?.role === "assistant";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id || !answer.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await sendAnswer(id, answer.trim());
      setAnswer("");
      setInterview(await getInterview(id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onFinish() {
    if (!id || busy) return;
    setBusy(true);
    setError(null);
    try {
      await completeInterview(id);
      router.push(`/results/${id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Layout title="Live Interview — InterviewAI">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold">Mock Interview</h1>
          <span className="text-sm font-medium text-slate-500">
            Question {Math.min(answered + 1, TOTAL_QUESTIONS)} of {TOTAL_QUESTIONS}
          </span>
        </div>

        {!interview && !error && (
          <p className="animate-pulse text-slate-500">Loading your interview…</p>
        )}

        <div className="space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                m.role === "assistant"
                  ? "bg-white shadow-sm ring-1 ring-slate-200"
                  : "ml-auto bg-indigo-600 text-white"
              }`}
            >
              {m.content}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {interview && !allAnswered && awaitingAnswer && (
          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              placeholder="Type your answer… explain your reasoning like you would to an interviewer."
              className="w-full rounded-lg border border-slate-300 px-4 py-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !answer.trim()}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Interviewer is thinking…" : "Submit answer"}
            </button>
          </form>
        )}

        {interview && allAnswered && (
          <div className="mt-8 rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
            <p className="mb-4 font-medium">
              That&apos;s all {TOTAL_QUESTIONS} questions — ready for your verdict?
            </p>
            <button
              onClick={onFinish}
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {busy ? "Scoring your interview…" : "End interview & get my score"}
            </button>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
      </div>
    </Layout>
  );
}
