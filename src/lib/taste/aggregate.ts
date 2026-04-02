import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { TasteProfile } from "./types";

interface Signal {
  signal_type: string;
  signal_value: string;
  confidence: number;
}

/**
 * Aggregate all taste_signals for a user into a TasteProfile
 * and write it back to profiles.taste_profile.
 */
export async function aggregateTasteProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<TasteProfile> {
  const { data: signals } = await supabase
    .from("taste_signals")
    .select("signal_type, signal_value, confidence")
    .eq("user_id", userId);

  if (!signals || signals.length === 0) {
    const empty: TasteProfile = {
      liked_dishes: [],
      disliked_dishes: [],
      liked_cuisines: [],
      disliked_cuisines: [],
      liked_ingredients: [],
      disliked_ingredients: [],
      liked_flavors: [],
      disliked_flavors: [],
      cooking_styles: [],
      dietary_goals: [],
      signal_count: 0,
      last_updated: new Date().toISOString(),
    };
    await supabase
      .from("profiles")
      .update({ taste_profile: empty as unknown as Database["public"]["Tables"]["profiles"]["Update"]["taste_profile"] })
      .eq("id", userId);
    return empty;
  }

  const profile: TasteProfile = {
    liked_dishes: topN(signals, "like_dish", 10),
    disliked_dishes: topN(signals, "dislike_dish", 10),
    liked_cuisines: topN(signals, "like_cuisine", 5),
    disliked_cuisines: topN(signals, "dislike_cuisine", 5),
    liked_ingredients: topN(signals, "like_ingredient", 10),
    disliked_ingredients: topN(signals, "dislike_ingredient", 10),
    liked_flavors: topN(signals, "like_flavor", 5),
    disliked_flavors: topN(signals, "dislike_flavor", 5),
    cooking_styles: topN(signals, "cooking_style", 5),
    dietary_goals: topN(signals, "dietary_goal", 3),
    signal_count: signals.length,
    last_updated: new Date().toISOString(),
  };

  await supabase
    .from("profiles")
    .update({ taste_profile: profile as unknown as Database["public"]["Tables"]["profiles"]["Update"]["taste_profile"] })
    .eq("id", userId);

  return profile;
}

/** Rank signal values by weighted score (count × average confidence), return top N. */
function topN(signals: Signal[], type: string, n: number): string[] {
  const filtered = signals.filter((s) => s.signal_type === type);
  if (filtered.length === 0) return [];

  const scores: Record<string, number> = {};
  for (const s of filtered) {
    scores[s.signal_value] = (scores[s.signal_value] ?? 0) + s.confidence;
  }

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value]) => value);
}
