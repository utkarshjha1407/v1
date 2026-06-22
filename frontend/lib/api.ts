import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
});

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export interface Interview {
  id: string;
  interview_type: string;
  mode: "text" | "voice";
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

export interface VoiceMessageOut {
  transcript: string;
  question: string;
  question_number: number;
  is_final: boolean;
  audio_base64?: string | null;
}

export async function createInterview(
  githubUrl: string,
  interviewType: string,
  userId?: string,
  mode: "text" | "voice" = "text"
): Promise<{ interview_id: string; first_question: string; audio_base64?: string | null }> {
  const { data } = await api.post("/api/interviews", {
    github_url: githubUrl,
    interview_type: interviewType,
    mode,
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

export async function sendVoiceAnswer(id: string, audioBlob: Blob): Promise<VoiceMessageOut> {
  const formData = new FormData();
  formData.append("file", audioBlob, "answer.webm");
  const { data } = await api.post(`/api/interviews/${id}/voice-message`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
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
