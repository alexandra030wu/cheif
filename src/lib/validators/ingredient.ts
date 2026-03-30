import { z } from "zod";

export const IngredientFormSchema = z.object({
  name: z.string().min(1, "食材名称不能为空"),
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
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
  expiry_date: z.string().optional(),
  notes: z.string().optional(),
});

export type IngredientFormData = z.infer<typeof IngredientFormSchema>;
