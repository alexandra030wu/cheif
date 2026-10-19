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

export interface FatLossTargets {
  enabled: boolean;
  /** 单人份每餐热量区间，默认 500–600 kcal */
  mealCaloriesMin?: number;
  mealCaloriesMax?: number;
  dailyCalorieTarget?: number;
  dailyProteinTargetG?: number;
}

export interface RecipeGenerationInput {
  ingredients: string[];
  cuisine?: string;
  dietaryRestrictions?: string[];
  servings?: number;
  maxCookingTime?: number;
  difficulty?: "easy" | "medium" | "hard";
  freeformNotes?: string;
  fatLoss?: FatLossTargets;
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
  // LLM 随菜谱生成的英文摄影描述,直接喂 Imagen 出封面。它知道这道菜的
  // 真实形态和器皿(冰沙在杯里/汤在碗里),比中文菜名塞英文模板准得多。
  coverImageDescription: z.string().optional(),
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
// "2"、"15分钟" 这类带数字的字符串取出数字;取不出就当没给,别拖垮整道菜
const optionalNumber = z.preprocess((v) => {
  const x = nullishToUndef(v);
  if (typeof x !== "string") return x;
  const m = x.match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : undefined;
}, z.number().optional());
const DIFFICULTY_ALIASES: Record<string, "easy" | "medium" | "hard"> = {
  简单: "easy",
  容易: "easy",
  中等: "medium",
  一般: "medium",
  困难: "hard",
  难: "hard",
};
const optionalDifficulty = z.preprocess((v) => {
  const x = nullishToUndef(v);
  if (typeof x !== "string") return x;
  const key = x.trim().toLowerCase();
  if (key === "easy" || key === "medium" || key === "hard") return key;
  return DIFFICULTY_ALIASES[key];
}, z.enum(["easy", "medium", "hard"]).optional());

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
  coverImageDescription: optionalString,
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
    coverImageDescription: partial.coverImageDescription?.trim() || undefined,
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
    fat_loss_mode?: boolean;
    daily_calorie_target?: number;
    daily_protein_target_g?: number;
  };
  tasteProfile?: ChatTasteProfile;
}

export const ChatResponseSchema = z.object({
  reply: z.string(),
  recipes: z.array(RecipeSchema),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

// 聊天推荐菜谱用的宽松版。DeepSeek 只有 json_object 模式、不受 schema 约束,
// 偶尔漏个字段或 difficulty 写成中文,严格的 ChatResponseSchema 会让三道菜
// 整体作废(2026-10-19 用户「抹茶拿铁 来个recipe」第一遍只出两行就停了)。
// 全部 optional,路由层用 normalizeChatRecipe 补默认值。
const optionalNutrition = z.preprocess(
  nullishToUndef,
  z
    .object({
      calories: optionalNumber,
      proteinG: optionalNumber,
      carbsG: optionalNumber,
      fatG: optionalNumber,
    })
    .optional()
);

export const LenientChatResponseSchema = z.object({
  reply: optionalString,
  recipes: z
    .array(ImportedRecipeSchema.extend({ nutritionEstimate: optionalNutrition }))
    .optional(),
});

type LenientChatRecipe = NonNullable<
  z.infer<typeof LenientChatResponseSchema>["recipes"]
>[number];

export function normalizeChatRecipe(partial: LenientChatRecipe): Recipe {
  const n = partial.nutritionEstimate;
  return {
    ...normalizeImportedRecipe(partial),
    // 营养四项齐了才保留,缺一项的估算没法用来记摄入
    nutritionEstimate:
      n &&
      n.calories !== undefined &&
      n.proteinG !== undefined &&
      n.carbsG !== undefined &&
      n.fatG !== undefined
        ? { calories: n.calories, proteinG: n.proteinG, carbsG: n.carbsG, fatG: n.fatG }
        : undefined,
  };
}

// ---------- Service interface ----------

export interface AIService {
  generateRecipe(input: RecipeGenerationInput): Promise<Recipe>;
  streamRecipe(input: RecipeGenerationInput): Promise<ReadableStream<string>>;
  analyzeIngredient(input: IngredientAnalysisInput): Promise<IngredientInfo>;
  generateChatRecipes(input: ChatRecipeInput): Promise<ChatResponse>;
  getProvider(): AIProviderID;
}
