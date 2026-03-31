import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DeleteRecipeButton } from "./_components/delete-recipe-button";

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-green-50 text-green-700",
  medium: "bg-amber-50 text-amber-700",
  hard: "bg-red-50 text-red-700",
};

async function SavedRecipeList() {
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
  const items = savedRecipes
    .map((s) => ({ saved: s, recipe: recipeMap.get(s.recipe_id) }))
    .filter((x): x is { saved: typeof x.saved; recipe: NonNullable<typeof x.recipe> } => !!x.recipe);

  return (
    <>
      <p className="text-sm text-gray-400 mt-1 mb-6">
        共 {items.length} 道收藏菜谱
      </p>
      <div className="space-y-3">
        {items.map(({ saved, recipe: r }) => {
          const totalMinutes =
            (r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0);
          const ingredients = Array.isArray(r.ingredients)
            ? (r.ingredients as { name: string }[])
            : [];
          const shown = ingredients.slice(0, 4).map((i) => i.name);
          const remaining = ingredients.length - shown.length;

          return (
            <div
              key={saved.id}
              className="rounded-xl border border-gray-100 bg-white p-4 hover:border-gray-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-gray-900 leading-snug">
                  {r.title}
                </h3>
                <div className="flex items-center gap-1 shrink-0">
                  {r.difficulty && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${
                        DIFFICULTY_STYLES[r.difficulty] ?? DIFFICULTY_STYLES.easy
                      }`}
                    >
                      {DIFFICULTY_LABELS[r.difficulty] ?? r.difficulty}
                    </span>
                  )}
                  <DeleteRecipeButton id={saved.id} />
                </div>
              </div>

              {r.description && (
                <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                  {r.description}
                </p>
              )}

              <div className="flex items-center gap-3 text-xs text-gray-400">
                {totalMinutes > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" />
                    </svg>
                    {totalMinutes} 分钟
                  </span>
                )}
                {r.cuisine && <span>{r.cuisine}</span>}
                {shown.length > 0 && (
                  <span className="truncate">
                    {shown.join("、")}
                    {remaining > 0 && ` +${remaining}`}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
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
        <SavedRecipeList />
      </Suspense>
    </div>
  );
}
