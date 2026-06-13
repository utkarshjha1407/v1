import axios from "axios";
import { supabase } from "@/lib/supabase";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
});

// Attach the Supabase JWT to every request when the user is signed in.
// getSession() reads from localStorage — no network call in the normal case.
api.interceptors.request.use(async (config) => {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      config.headers.Authorization = `Bearer ${data.session.access_token}`;
    }
  }
  return config;
});

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export interface Interview {
  id: string;
  interview_type: string;
  status: "in_progress" | "completed";
  score: number | null;
  feedback: string | null;
  created_at?: string;
  messages: ChatMessage[];
}

export interface NextQuestion {
  question: string;
  question_number: number;
  is_final: boolean;
}

export async function createInterview(
  options: { githubUrl?: string; skill?: string },
  interviewType: string,
  userId?: string
): Promise<{ interview_id: string; first_question: string }> {
  const { data } = await api.post("/api/interviews", {
    github_url: options.githubUrl ?? null,
    skill: options.skill ?? null,
    interview_type: interviewType,
    user_id: userId ?? null,
  });
  return data;
}

export async function getInterview(id: string): Promise<Interview> {
  const { data } = await api.get(`/api/interviews/${id}`);
  return data;
}

export async function sendAnswer(id: string, content: string): Promise<NextQuestion> {
  const { data } = await api.post(`/api/interviews/${id}/message`, { content });
  return data;
}

export async function completeInterview(
  id: string
): Promise<{ score: number; feedback: string }> {
  const { data } = await api.post(`/api/interviews/${id}/complete`);
  return data;
}

export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (err.code === "ERR_NETWORK") {
      return "Cannot reach the backend — is it running on " +
        (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000") + "?";
    }
  }
  return "Something went wrong. Please try again.";
}
