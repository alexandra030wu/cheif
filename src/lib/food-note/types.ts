import { z } from "zod";

// LLM output is unreliable — every field optional per CLAUDE.md §2.
// Soft constraints live in the prompt; hard constraints would fail the whole call.
export const FoodNoteExtractionItemSchema = z.object({
  food_name: z.string().optional(),
  entry_type: z.enum(["food", "technique"]).optional(),
  summary_md: z.string().optional(),
  ingredient_tags: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const FoodNoteExtractionSchema = z.object({
  notes: z.array(FoodNoteExtractionItemSchema).optional(),
});

export type FoodNoteExtractionItem = z.infer<typeof FoodNoteExtractionItemSchema>;

// Items that survived confidence + name filtering and are ready to upsert.
export interface FoodNoteCandidate {
  food_name: string;
  food_name_normalized: string;
  entry_type: "food" | "technique";
  summary_md: string;
  ingredient_tags: string[];
  confidence: number;
}
