"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export interface CookLogNutrition {
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}

export async function logCookedRecipe(input: {
  title: string;
  nutrition?: CookLogNutrition | null;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !input.title.trim()) return;

  await supabase.from("cook_log").insert({
    user_id: user.id,
    recipe_title: input.title.trim(),
    nutrition: (input.nutrition ?? null) as unknown as Json,
  });

  revalidatePath("/nutrition");
}

export async function deleteCookLogEntry(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("cook_log").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/nutrition");
}
