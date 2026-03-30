import { z } from "zod";

export const RecipeGenerationRequestSchema = z.object({
  ingredients: z.array(z.string()).min(1, "请至少选择一种食材"),
  cuisine: z.string().optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  servings: z.number().int().positive().optional(),
  maxCookingTime: z.number().positive().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  freeformNotes: z.string().optional(),
});

export type RecipeGenerationRequest = z.infer<typeof RecipeGenerationRequestSchema>;
