import { createClient } from "@/lib/supabase/server";
import { RecipeSchema } from "@/lib/ai-service/types";
import type { Json } from "@/lib/supabase/types";
import { generateAndStoreCover } from "@/lib/icon-generation";
import { aggregateTasteProfile } from "@/lib/taste";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = RecipeSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const recipe = parsed.data;

  // Insert into recipes table
  const { data: inserted, error: insertError } = await supabase
    .from("recipes")
    .insert({
      title: recipe.title,
      description: recipe.description,
      cuisine: recipe.cuisine,
      servings: recipe.servings,
      prep_time_minutes: recipe.prepTimeMinutes,
      cook_time_minutes: recipe.cookTimeMinutes,
      difficulty: recipe.difficulty,
      ingredients: recipe.ingredients as unknown as Json,
      steps: recipe.steps as unknown as Json,
      nutrition_estimate: (recipe.nutritionEstimate ?? null) as unknown as Json,
      tags: recipe.tags,
      generated_by: "ai",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  // Insert into saved_recipes table
  const { error: saveError } = await supabase.from("saved_recipes").insert({
    user_id: user.id,
    recipe_id: inserted.id,
  });

  if (saveError) {
    return Response.json({ error: saveError.message }, { status: 500 });
  }

  // Fire-and-forget cover image generation (uses admin client internally)
  void generateAndStoreCover(inserted.id, recipe.title);

  // Fire-and-forget: extract taste signals from save behavior
  void (async () => {
    try {
      const signals = [
        { user_id: user.id, signal_type: "like_dish", signal_value: recipe.title, confidence: 0.6, source: "behavior" },
        ...(recipe.cuisine ? [{ user_id: user.id, signal_type: "like_cuisine", signal_value: recipe.cuisine, confidence: 0.5, source: "behavior" }] : []),
        ...recipe.ingredients.slice(0, 3).map((ing) => ({
          user_id: user.id,
          signal_type: "like_ingredient",
          signal_value: ing.name,
          confidence: 0.4,
          source: "behavior",
        })),
      ];
      await supabase.from("taste_signals").insert(signals);
      await aggregateTasteProfile(supabase, user.id);
    } catch {
      // best-effort, don't fail the save
    }
  })();

  return Response.json({ id: inserted.id, saved: true });
}
