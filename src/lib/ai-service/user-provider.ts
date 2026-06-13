import type { createClient } from "@/lib/supabase/server";
import { providerIdForPreference } from "./registry";
import type { AIProviderID } from "./types";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Resolve the AI provider a user has chosen (profiles.ai_model_preference).
 * Falls back to Claude when there's no user or no stored preference — one
 * lightweight query per AI call. Every server-side AI entrypoint funnels
 * through this so the model selector applies consistently across chat,
 * extraction, recipe generation, etc.
 */
export async function getUserProviderId(
  supabase: ServerClient,
  userId: string | null | undefined
): Promise<AIProviderID> {
  if (!userId) return providerIdForPreference(null);
  const { data } = await supabase
    .from("profiles")
    .select("ai_model_preference")
    .eq("id", userId)
    .maybeSingle();
  return providerIdForPreference(data?.ai_model_preference);
}
