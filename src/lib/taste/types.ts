import { z } from "zod";

// ── Taste Profile (aggregated, stored in profiles.taste_profile) ──

export interface TasteProfile {
  liked_dishes: string[];
  disliked_dishes: string[];
  liked_cuisines: string[];
  disliked_cuisines: string[];
  liked_ingredients: string[];
  disliked_ingredients: string[];
  liked_flavors: string[];
  disliked_flavors: string[];
  cooking_styles: string[];
  dietary_goals: string[];
  signal_count: number;
  last_updated: string;
}

export const EMPTY_TASTE_PROFILE: TasteProfile = {
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
  last_updated: "",
};

// ── Signal types ──

export const SIGNAL_TYPES = [
  "like_dish",
  "dislike_dish",
  "like_cuisine",
  "dislike_cuisine",
  "like_ingredient",
  "dislike_ingredient",
  "like_flavor",
  "dislike_flavor",
  "cooking_style",
  "dietary_goal",
] as const;

export type SignalType = (typeof SIGNAL_TYPES)[number];

// ── Zod schema for AI extraction output ──

export const TasteSignalSchema = z.object({
  signal_type: z.enum(SIGNAL_TYPES),
  signal_value: z.string(),
  confidence: z.number().min(0).max(1),
  context: z.string().max(100).optional(),
});

export const TasteExtractionSchema = z.object({
  signals: z.array(TasteSignalSchema),
});

export type TasteSignal = z.infer<typeof TasteSignalSchema>;
