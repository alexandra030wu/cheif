import { z } from "zod";

export const ChatRequestSchema = z.object({
  message: z.string().min(1),
  ingredients: z.array(z.string()),
  urgentIngredients: z.array(z.string()).optional(),
  timeOfDay: z.enum(["morning", "noon", "evening", "latenight"]),
  preferences: z
    .object({
      dietary_preferences: z.array(z.string()).optional(),
      allergies: z.array(z.string()).optional(),
      cooking_level: z.string().optional(),
      kitchen_equipment: z.array(z.string()).optional(),
      default_servings: z.string().optional(),
    })
    .optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
