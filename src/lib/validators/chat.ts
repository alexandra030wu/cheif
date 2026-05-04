import { z } from "zod";

export const ChatIngredientSchema = z.object({
  name: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  daysUntilExpiry: z.number().nullable(),
});

/** Accept both new object format and legacy string format for ingredients */
const IngredientItemSchema = z.union([
  ChatIngredientSchema,
  z.string().transform((name) => ({
    name,
    quantity: null,
    unit: null,
    daysUntilExpiry: null,
  })),
]);

// 老用户的 profiles.taste_profile JSONB 可能只有部分字段（早期 code 写入时
// 字段还没加全），缺失字段必须默认成空值，否则 Zod 会 hard fail 整个请求。
export const TasteProfileSchema = z.object({
  liked_dishes: z.array(z.string()).default([]),
  disliked_dishes: z.array(z.string()).default([]),
  liked_cuisines: z.array(z.string()).default([]),
  disliked_cuisines: z.array(z.string()).default([]),
  liked_ingredients: z.array(z.string()).default([]),
  disliked_ingredients: z.array(z.string()).default([]),
  liked_flavors: z.array(z.string()).default([]),
  disliked_flavors: z.array(z.string()).default([]),
  cooking_styles: z.array(z.string()).default([]),
  dietary_goals: z.array(z.string()).default([]),
  signal_count: z.number().default(0),
  last_updated: z.string().default(""),
}).optional();

export const ChatHistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const ChatRequestSchema = z.object({
  message: z.string().min(1),
  ingredients: z.array(IngredientItemSchema),
  urgentIngredients: z.array(z.string()).optional(), // legacy field, ignored
  timeOfDay: z.enum(["morning", "noon", "evening", "latenight"]),
  // Recent conversation history (excludes the current `message`). Capped on
  // the client at ~20 turns to bound prompt size.
  history: z.array(ChatHistoryMessageSchema).optional().default([]),
  preferences: z
    .object({
      nickname: z.string().optional(),
      dietary_preferences: z.array(z.string()).optional(),
      allergies: z.array(z.string()).optional(),
      cooking_level: z.string().optional(),
      kitchen_equipment: z.array(z.string()).optional(),
      default_servings: z.string().optional(),
    })
    .optional(),
  tasteProfile: TasteProfileSchema,
});

export type ChatHistoryMessage = z.infer<typeof ChatHistoryMessageSchema>;

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
