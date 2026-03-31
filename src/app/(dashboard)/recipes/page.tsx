import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Recipe } from "@/lib/ai-service";
import { SavedRecipeList, type SavedRecipeItem } from "./_components/saved-recipe-list";

async function SavedRecipeLoader() {
  const supabase = await createClient();

  const { data: savedRecipes } = await supabase
    .from("saved_recipes")
    .select("id, saved_at, recipe_id")
    .order("saved_at", { ascending: false });

  if (!savedRecipes || savedRecipes.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">📖</p>
        <p className="text-sm">还没有收藏的菜谱</p>
        <Link
          href="/chat"
          className="mt-4 inline-block text-sm text-gray-900 underline underline-offset-2"
        >
          去聊天页生成菜谱
        </Link>
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
        ? (r.steps as { order: number; instruction: string; durationMinutes?: number }[])
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
      <div className="h-4 w-24 bg-gray-100 rounded mt-1 mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function RecipesPage() {
  return (
    <div className="px-4 py-6 md:p-8 max-w-2xl pt-14">
      <h1 className="text-2xl font-bold text-gray-900">收藏菜谱</h1>
      <Suspense fallback={<ListSkeleton />}>
        <SavedRecipeLoader />
      </Suspense>
    </div>
  );
}
