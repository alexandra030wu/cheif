import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IngredientListClient } from "./ingredient-list-client";

export async function IngredientList() {
  const supabase = await createClient();
  const { data: ingredients } = await supabase
    .from("ingredients")
    .select("*")
    .order("created_at", { ascending: false });

  if (!ingredients || ingredients.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">🥦</p>
        <p className="text-sm">还没有食材，先添加几样吧</p>
        <Link
          href="/kitchen/add"
          className="mt-4 inline-block text-sm text-gray-900 underline underline-offset-2"
        >
          添加第一个食材
        </Link>
      </div>
    );
  }

  const items = ingredients.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    expiry_date: item.expiry_date,
  }));

  return <IngredientListClient ingredients={items} />;
}
