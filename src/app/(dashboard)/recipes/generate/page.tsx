import { createClient } from "@/lib/supabase/server";
import { RecipeGenerator } from "./_components/recipe-generator";

export default async function GenerateRecipePage() {
  const supabase = await createClient();
  const { data: ingredients } = await supabase
    .from("ingredients")
    .select("id, name, category, quantity, unit")
    .order("name", { ascending: true });

  return (
    <div className="px-4 py-6 md:p-8 md:max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">AI 菜谱生成</h1>
        <p className="text-sm text-gray-400 mt-1">
          根据食材库中的食材，自动生成菜谱
        </p>
      </div>
      <RecipeGenerator ingredients={ingredients ?? []} />
    </div>
  );
}
