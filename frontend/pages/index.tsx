import { useRouter } from "next/router";
import { FormEvent, useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { createInterview, errorMessage } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const INTERVIEW_TYPES = [
  { value: "swe", label: "Software Engineering", blurb: "Design decisions and trade-offs in your projects" },
  { value: "dsa", label: "DSA", blurb: "Algorithms and data structures, anchored in your code" },
];

export default function Home() {
  const router = useRouter();
  const [githubUrl, setGithubUrl] = useState("");
  const [interviewType, setInterviewType] = useState("swe");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!githubUrl.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { interview_id } = await createInterview(githubUrl.trim(), interviewType, userId);
      router.push(`/interview/${interview_id}`);
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <Layout>
      <section className="mx-auto max-w-2xl pt-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          The AI interviewer that has{" "}
          <span className="text-indigo-600">read your GitHub</span>
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Five sharp questions about <em>your actual projects</em> — not textbook
          trivia. Get a 0–10 score and honest feedback in minutes. Free.
        </p>

        <form onSubmit={onSubmit} className="mt-10 space-y-4 text-left">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Your GitHub profile
            </span>
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/your-username"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              disabled={loading}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {INTERVIEW_TYPES.map((t) => (
              <button
                type="button"
                key={t.value}
                onClick={() => setInterviewType(t.value)}
                disabled={loading}
                className={`rounded-lg border px-4 py-3 text-left transition ${
                  interviewType === t.value
                    ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600"
                    : "border-slate-300 bg-white hover:border-slate-400"
                }`}
              >
                <span className="block font-semibold">{t.label}</span>
                <span className="block text-sm text-slate-500">{t.blurb}</span>
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || !githubUrl.trim()}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Reading your repos…" : "Start Free AI Interview"}
          </button>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}
        </form>

        <p className="mt-6 text-sm text-slate-500">
          No credit card. No installs. Your repos are read via the public GitHub API.
        </p>
      </section>
    </Layout>
  );
}
