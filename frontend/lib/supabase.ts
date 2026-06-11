import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Null until Supabase env vars are configured — the app then runs without sign-in,
// so the interview flow is testable before the OAuth setup is done.
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;
