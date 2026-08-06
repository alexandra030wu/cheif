import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Recipe } from "@/lib/ai-service";
import { SavedRecipeList, type SavedRecipeItem } from "./_components/saved-recipe-list";
import { ImportRecipeButton } from "./_components/import-recipe-button";

async function SavedRecipeLoader() {
  const supabase = await createClient();

  const { data: savedRecipes } = await supabase
    .from("saved_recipes")
    .select("id, saved_at, recipe_id")
    .order("saved_at", { ascending: false });

  if (!savedRecipes || savedRecipes.length === 0) {
    return (
      <div className="text-center py-16 text-ink-muted">
        <p className="text-4xl mb-3">📖</p>
        <p className="text-[12px]">还没有收藏的菜谱</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Link
            href="/chat"
            className="text-[12px] text-ink underline underline-offset-2"
          >
            去聊天页生成
          </Link>
          <span className="text-ink-muted">·</span>
          <ImportRecipeButton variant="cta" />
        </div>
      </div>
    );
  }

  const recipeIds = savedRecipes.map((s) => s.recipe_id);
  const { data: recipes } = await supabase
    .from("recipes")
    .select("*")
    .in("id", recipeIds);

  const recipeMap = new Map((recipes ?? []).map((r) => [r.id, r]));

  const items: SavedRecipeItem[] = savedRecipes
    .map((s) => {
      const r = recipeMap.get(s.recipe_id);
      if (!r) return null;

      const ingredientsArr = Array.isArray(r.ingredients)
        ? (r.ingredients as { name: string; amount: string; unit: string; notes?: string }[])
        : [];
      const stepsArr = Array.isArray(r.steps)
        ? (r.steps as { order: number; instruction: string; durationSeconds: number; tip?: string }[])
        : [];

      const recipe: Recipe = {
        title: r.title,
        description: r.description ?? "",
        cuisine: r.cuisine ?? "",
        servings: r.servings ?? 1,
        prepTimeMinutes: r.prep_time_minutes ?? 0,
        cookTimeMinutes: r.cook_time_minutes ?? 0,
        difficulty: (r.difficulty as "easy" | "medium" | "hard") ?? "easy",
        ingredients: ingredientsArr,
        steps: stepsArr,
        nutritionEstimate: r.nutrition_estimate as Recipe["nutritionEstimate"] ?? undefined,
        tags: r.tags ?? [],
        coverImageUrl: r.cover_image_url ?? undefined,
      };

      return {
        savedId: s.id,
        recipe,
        title: r.title,
        description: r.description,
        difficulty: r.difficulty,
        cuisine: r.cuisine,
        totalMinutes: (r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0),
        ingredientNames: ingredientsArr.map((i) => i.name),
      } satisfies SavedRecipeItem;
    })
    .filter((x): x is SavedRecipeItem => x !== null);

  return <SavedRecipeList items={items} />;
}

function ListSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-24 bg-surface-dim rounded mt-1 mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface-dim rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

export default function RecipesPage() {
  return (
    <div className="bg-canvas px-4 py-6 md:p-8 max-w-2xl pt-14">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-[22px] font-bold text-ink">收藏菜谱</h1>
        <ImportRecipeButton />
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <SavedRecipeLoader />
      </Suspense>
    </div>
  );
}
