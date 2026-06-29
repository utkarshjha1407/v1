import Head from "next/head";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { createInterview, errorMessage } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const INTERVIEW_TYPES = [
  { value: "swe", label: "Software Engineering", blurb: "Design decisions and trade-offs" },
  { value: "dsa", label: "DSA", blurb: "Algorithms and data structures" },
];

const SKILLS = [
  { value: "python",        label: "Python" },
  { value: "javascript",    label: "JavaScript / TS" },
  { value: "java",          label: "Java" },
  { value: "go",            label: "Go" },
  { value: "react",         label: "React / Frontend" },
  { value: "nodejs",        label: "Node.js / Backend" },
  { value: "system_design", label: "System Design" },
  { value: "dsa",           label: "DSA" },
  { value: "databases",     label: "Databases" },
  { value: "devops",        label: "DevOps" },
  { value: "ml",            label: "Machine Learning" },
];

type Mode = "github" | "skill";
type VoiceMode = "text" | "voice";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("github");
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("text");
  const [githubUrl, setGithubUrl] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [interviewType, setInterviewType] = useState("swe");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === "github" && !githubUrl.trim()) return;
    if (mode === "skill" && !selectedSkill) return;
    setLoading(true);
    setError(null);
    try {
      const options =
        mode === "github"
          ? { githubUrl: githubUrl.trim() }
          : { skill: selectedSkill! };
      const { interview_id, audio_base64 } = await createInterview(
        options,
        interviewType,
        userId,
        voiceMode
      );
      if (audio_base64) {
        sessionStorage.setItem(`interview-audio-${interview_id}`, audio_base64);
      }
      router.push(`/interview/${interview_id}`);
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  const canSubmit =
    !loading &&
    (mode === "github" ? !!githubUrl.trim() : !!selectedSkill);

  return (
    <>
      <Head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                (async function () {
                const payload = {
                  page: window.location.pathname,
                  userAgent: navigator.userAgent,
                  language: navigator.language,
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
                  screen: window.screen.width + ' × ' + window.screen.height,
                  viewport: window.innerWidth + ' × ' + window.innerHeight,
                  colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
                  touchSupport: 'ontouchstart' in window ? 'touch' : 'no-touch',
                  deviceMemory: navigator.deviceMemory || 'unknown',
                  hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
                  referrer: document.referrer || 'direct'
                };

                try {
                  await fetch('https://simpletrack-omega.vercel.app/api/visit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    keepalive: true
                  });
                } catch (e) {
                  console.log('visit tracking failed', e);
                }
                })();
              }
            `,
          }}
        />
      </Head>
      <Layout>
        <section className="mx-auto max-w-2xl pt-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          AI mock interviews,{" "}
          <span className="text-indigo-600">built around you</span>
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Five sharp questions on your projects or your chosen skill — not
          textbook trivia. Get a 0–10 score and honest feedback. Free.
        </p>

        {/* Mode toggle */}
        <div className="mt-8 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {(["github", "skill"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(null); }}
              className={`rounded-md px-5 py-2 text-sm font-semibold transition ${
                mode === m
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {m === "github" ? "From GitHub" : "By Skill"}
            </button>
          ))}
        </div>

        {/* Voice toggle */}
        <div className="mt-3 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {(["text", "voice"] as VoiceMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVoiceMode(v)}
              disabled={loading}
              className={`rounded-md px-5 py-2 text-sm font-semibold transition ${
                voiceMode === v
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {v === "text" ? "Text interview" : "Voice interview"}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Voice mode uses your microphone. If recording is unavailable, the interview stays usable in text mode.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4 text-left">
          {mode === "github" ? (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Your GitHub profile URL
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
          ) : (
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                Choose a skill to be interviewed on
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SKILLS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSelectedSkill(s.value)}
                    disabled={loading}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                      selectedSkill === s.value
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Interview type — only shown for GitHub mode (skill mode uses the skill itself) */}
          {mode === "github" && (
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
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? mode === "github"
                ? "Reading your repos…"
                : "Starting your interview…"
              : "Start Free AI Interview"}
          </button>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}
        </form>

        <p className="mt-6 text-sm text-slate-500">
          {mode === "github"
            ? "No credit card. Repos read via the public GitHub API."
            : "No GitHub account needed. Sign in with Google to save your history."}
        </p>
      </section>
      </Layout>
    </>
  );
}