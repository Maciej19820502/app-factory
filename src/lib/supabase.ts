import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy-initialized client-side Supabase instance
let _supabaseClient: SupabaseClient | null = null;

function getClientSupabase(): SupabaseClient {
  if (!_supabaseClient && typeof window !== "undefined") {
    _supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    );
  }
  return _supabaseClient!;
}

// Proxy that lazily initializes on first property access (after hydration)
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClientSupabase();
    if (!client) return undefined;
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type AppSubmission = {
  id: string;
  nickname: string;
  prompt_text: string;
  generated_html: string | null;
  artifact_slug: string;
  score_innovation: number | null;
  score_business: number | null;
  score_prompt: number | null;
  score_avg: number | null;
  ai_comment: string | null;
  created_at: string;
};

export type SessionControl = {
  id: number;
  is_active: boolean;
  ends_at: string | null;
  scoring_done: boolean;
  app_session: boolean;
  topic_constraint: string | null;
  prompt_max_length: number;
};
