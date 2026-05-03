import { z } from "zod";

// ---------- Provider configuration ----------

export type AIProviderID = "openai" | "anthropic" | "deepseek" | "ollama";

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
      durationSeconds: z.number().optional(),
      tip: z.string().optional(),
    })
  ),
  nutritionEstimate: z
    .object({
      calories: z.number(),
      proteinG: z.number(),
      carbsG: z.number(),
      fatG: z.number(),
    })
    .optional(),
  tags: z.array(z.string()),
  coverImageUrl: z.string().optional(),
});

export type Recipe = z.infer<typeof RecipeSchema>;

// Import/extraction variant: all fields optional because LLM extracting from
// screenshots/pasted text may only find a subset of fields. Hard constraints
// would kill the whole extraction. Nutrition intentionally omitted — LLM
// fabricates unreliable numbers for unknown dishes.
//
// LLMs (esp. Claude) ignore "omit unknown fields" instructions and instead emit
// `""`, `null`, `"<UNKNOWN>"`, `"N/A"`, `"未知"`, etc. as placeholders, which
// trips `z.number()` / `z.enum()` validation. Normalize any of these to
// undefined so the rest of the object can still parse.
const PLACEHOLDER_STRINGS = new Set([
  "",
  "<unknown>",
  "unknown",
  "n/a",
  "na",
  "null",
  "undefined",
  "未知",
  "无",
  "none",
  "-",
]);
const nullishToUndef = (v: unknown) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string" && PLACEHOLDER_STRINGS.has(v.trim().toLowerCase())) {
    return undefined;
  }
  return v;
};

const optionalString = z.preprocess(nullishToUndef, z.string().optional());
const optionalNumber = z.preprocess(nullishToUndef, z.number().optional());
const optionalDifficulty = z.preprocess(
  nullishToUndef,
  z.enum(["easy", "medium", "hard"]).optional()
);

export const ImportedRecipeSchema = z.object({
  title: optionalString,
  description: optionalString,
  cuisine: optionalString,
  servings: optionalNumber,
  prepTimeMinutes: optionalNumber,
  cookTimeMinutes: optionalNumber,
  difficulty: optionalDifficulty,
  ingredients: z
    .array(
      z.object({
        name: optionalString,
        amount: optionalString,
        unit: optionalString,
        notes: optionalString,
      })
    )
    .optional(),
  steps: z
    .array(
      z.object({
        order: optionalNumber,
        instruction: optionalString,
        durationSeconds: optionalNumber,
        tip: optionalString,
      })
    )
    .optional(),
  tags: z.array(z.string()).optional(),
});

export type ImportedRecipe = z.infer<typeof ImportedRecipeSchema>;

// Merge an imported recipe with sensible defaults so it passes RecipeSchema.parse().
export function normalizeImportedRecipe(partial: ImportedRecipe): Recipe {
  return {
    title: partial.title?.trim() || "未命名菜谱",
    description: partial.description?.trim() ?? "",
    cuisine: partial.cuisine?.trim() || "未分类",
    servings: partial.servings && partial.servings > 0 ? partial.servings : 2,
    prepTimeMinutes: partial.prepTimeMinutes ?? 0,
    cookTimeMinutes: partial.cookTimeMinutes ?? 0,
    difficulty: partial.difficulty ?? "medium",
    ingredients: (partial.ingredients ?? [])
      .map((i) => ({
        name: i.name?.trim() ?? "",
        amount: i.amount?.trim() ?? "",
        unit: i.unit?.trim() ?? "",
        notes: i.notes?.trim() || undefined,
      }))
      .filter((i) => i.name !== ""),
    steps: (partial.steps ?? [])
      .filter((s) => s.instruction?.trim())
      .map((s, idx) => ({
        order: s.order ?? idx + 1,
        instruction: s.instruction!.trim(),
        durationSeconds: s.durationSeconds,
        tip: s.tip?.trim() || undefined,
      })),
    tags: (partial.tags ?? []).map((t) => t.trim()).filter(Boolean),
  };
}

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

export interface ChatIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  daysUntilExpiry: number | null;
}

export interface ChatTasteProfile {
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

export interface ChatRecipeInput {
  message: string;
  ingredients: ChatIngredient[];
  timeOfDay: "morning" | "noon" | "evening" | "latenight";
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  preferences?: {
    nickname?: string;
    dietary_preferences?: string[];
    allergies?: string[];
    cooking_level?: string;
    kitchen_equipment?: string[];
    default_servings?: string;
  };
  tasteProfile?: ChatTasteProfile;
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
