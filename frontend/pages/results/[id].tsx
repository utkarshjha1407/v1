import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { errorMessage, getInterview, Interview } from "@/lib/api";

function verdict(score: number): string {
  if (score >= 9) return "Outstanding — interview-ready.";
  if (score >= 7) return "Strong — a few sharp edges to polish.";
  if (score >= 5) return "Decent — keep practicing the weak spots.";
  if (score >= 3) return "Needs work — but now you know where.";
  return "Rough round — every expert started here.";
}

export default function ResultsPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : null;

  const [interview, setInterview] = useState<Interview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    getInterview(id)
      .then(setInterview)
      .catch((err) => setError(errorMessage(err)));
  }, [id]);

  async function share() {
    const url = window.location.href;
    const text = `I scored ${interview?.score}/10 on an AI mock interview on InterviewAI. Try it:`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "My InterviewAI result", text, url });
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Layout title="Your Results — InterviewAI">
      <div className="mx-auto max-w-2xl">
        {!interview && !error && (
          <p className="animate-pulse text-slate-500">Loading your results…</p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {interview && interview.status !== "completed" && (
          <div className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
            <p className="mb-4">This interview isn&apos;t finished yet.</p>
            <Link href={`/interview/${interview.id}`} className="font-semibold text-indigo-600 hover:underline">
              Continue the interview →
            </Link>
          </div>
        )}

        {interview && interview.status === "completed" && (
          <>
            <section className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
                Your score
              </p>
              <p className="my-2 text-7xl font-extrabold text-indigo-600">
                {interview.score}
                <span className="text-3xl font-semibold text-slate-400">/10</span>
              </p>
              <p className="font-medium text-slate-700">{verdict(interview.score ?? 0)}</p>

              {interview.feedback && (
                <p className="mx-auto mt-6 max-w-xl rounded-lg bg-slate-50 px-4 py-3 text-left text-[15px] leading-relaxed text-slate-700">
                  {interview.feedback}
                </p>
              )}

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  onClick={share}
                  className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-500"
                >
                  {copied ? "Link copied!" : "Share your result"}
                </button>
                <Link
                  href="/"
                  className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Practice again
                </Link>
              </div>
            </section>

            <section className="mt-8">
              <h2 className="mb-4 text-lg font-bold">Full transcript</h2>
              <div className="max-h-[28rem] space-y-4 overflow-y-auto rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                {interview.messages.map((m, i) => (
                  <div key={i}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {m.role === "assistant" ? "Interviewer" : "You"}
                    </p>
                    <p className="text-[15px] leading-relaxed text-slate-800">{m.content}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}
