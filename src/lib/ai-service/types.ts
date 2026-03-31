import { z } from "zod";

// ---------- Provider configuration ----------

export type AIProviderID = "openai" | "anthropic" | "ollama";

export interface AIProviderConfig {
  id: AIProviderID;
  apiKey?: string;
  model: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
}

// ---------- Domain inputs ----------

export interface RecipeGenerationInput {
  ingredients: string[];
  cuisine?: string;
  dietaryRestrictions?: string[];
  servings?: number;
  maxCookingTime?: number;
  difficulty?: "easy" | "medium" | "hard";
  freeformNotes?: string;
}

export interface IngredientAnalysisInput {
  name: string;
  description?: string;
}

// ---------- Domain outputs ----------

export const RecipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  cuisine: z.string(),
  servings: z.number(),
  prepTimeMinutes: z.number(),
  cookTimeMinutes: z.number(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  ingredients: z.array(
    z.object({
      name: z.string(),
      amount: z.string(),
      unit: z.string(),
      notes: z.string().optional(),
    })
  ),
  steps: z.array(
    z.object({
      order: z.number(),
      instruction: z.string(),
      durationMinutes: z.number().optional(),
    })
  ),
  nutritionEstimate: z
    .object({
      calories: z.number().optional(),
      protein: z.string().optional(),
      carbs: z.string().optional(),
      fat: z.string().optional(),
    })
    .optional(),
  tags: z.array(z.string()),
  coverImageUrl: z.string().optional(),
});

export type Recipe = z.infer<typeof RecipeSchema>;

export const IngredientInfoSchema = z.object({
  name: z.string(),
  category: z.enum([
    "vegetable",
    "fruit",
    "protein",
    "dairy",
    "grain",
    "spice",
    "condiment",
    "other",
  ]),
  shelfLifeDays: z.number().optional(),
  storageTip: z.string().optional(),
  commonPairings: z.array(z.string()),
  substitutes: z.array(z.string()),
});

export type IngredientInfo = z.infer<typeof IngredientInfoSchema>;

// ---------- Chat domain ----------

export interface ChatRecipeInput {
  message: string;
  ingredients: string[];
  urgentIngredients?: string[];
  timeOfDay: "morning" | "noon" | "evening" | "latenight";
  preferences?: {
    dietary_preferences?: string[];
    allergies?: string[];
    cooking_level?: string;
    kitchen_equipment?: string[];
    default_servings?: string;
  };
}

export const ChatResponseSchema = z.object({
  reply: z.string(),
  recipes: z.array(RecipeSchema),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

// ---------- Service interface ----------

export interface AIService {
  generateRecipe(input: RecipeGenerationInput): Promise<Recipe>;
  streamRecipe(input: RecipeGenerationInput): Promise<ReadableStream<string>>;
  analyzeIngredient(input: IngredientAnalysisInput): Promise<IngredientInfo>;
  generateChatRecipes(input: ChatRecipeInput): Promise<ChatResponse>;
  getProvider(): AIProviderID;
}
