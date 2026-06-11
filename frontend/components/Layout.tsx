import Head from "next/head";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export default function Layout({
  children,
  title = "InterviewAI — Free AI Mock Interviews",
  description = "Practice AI-powered mock interviews personalised from your GitHub projects. Free, instant feedback with a 0-10 score.",
}: {
  children: ReactNode;
  title?: string;
  description?: string;
}) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Interview<span className="text-indigo-600">AI</span>
          </Link>
          {supabase &&
            (user ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="hidden text-slate-500 sm:inline">{user.email}</span>
                <button
                  onClick={() => supabase!.auth.signOut()}
                  className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() =>
                  supabase!.auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
                  })
                }
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
              >
                Sign in with Google
              </button>
            ))}
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-sm text-slate-500">
        InterviewAI — free AI mock interviews, personalised from your GitHub.
      </footer>
    </div>
  );
}
