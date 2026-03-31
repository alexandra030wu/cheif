import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { RecipeGenerator } from "./_components/recipe-generator";

async function IngredientsLoader() {
  const supabase = await createClient();
  const { data: ingredients } = await supabase
    .from("ingredients")
    .select("id, name, category, quantity, unit")
    .order("name", { ascending: true });

  return <RecipeGenerator ingredients={ingredients ?? []} />;
}

function GeneratorSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <div className="h-4 w-28 bg-gray-100 rounded mb-3" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-7 bg-gray-100 rounded-md" style={{ width: `${48 + (i % 3) * 16}px` }} />
          ))}
        </div>
      </div>
      <div className="h-12 bg-gray-200 rounded-xl" />
    </div>
  );
}

export default function GenerateRecipePage() {
  return (
    <div className="px-4 py-6 md:p-8 md:max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">AI 菜谱生成</h1>
        <p className="text-sm text-gray-400 mt-1">
          根据食材库中的食材，自动生成菜谱
        </p>
      </div>
      <Suspense fallback={<GeneratorSkeleton />}>
        <IngredientsLoader />
      </Suspense>
    </div>
  );
}
