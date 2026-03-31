"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deleteSavedRecipe(savedRecipeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");

  // Get the recipe_id before deleting the saved_recipes row
  const { data: saved } = await supabase
    .from("saved_recipes")
    .select("recipe_id")
    .eq("id", savedRecipeId)
    .eq("user_id", user.id)
    .single();

  if (!saved) return;

  // Delete from saved_recipes
  await supabase
    .from("saved_recipes")
    .delete()
    .eq("id", savedRecipeId)
    .eq("user_id", user.id);

  // Delete the recipe itself (only if this user created it)
  await supabase
    .from("recipes")
    .delete()
    .eq("id", saved.recipe_id)
    .eq("created_by", user.id);

  revalidatePath("/recipes");
}
