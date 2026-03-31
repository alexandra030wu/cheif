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

  // Sort: expired first, then by expiry date ascending, no-expiry last
  const now = Date.now();
  const sorted = [...ingredients].sort((a, b) => {
    const aTime = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity;
    const bTime = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity;
    // Both have expiry: sort ascending (most urgent first)
    if (aTime !== Infinity && bTime !== Infinity) return aTime - bTime;
    // One has expiry, the other doesn't: expiry first
    if (aTime !== Infinity) return -1;
    if (bTime !== Infinity) return 1;
    // Neither has expiry: keep original order
    return 0;
  });

  const items = sorted.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    expiry_date: item.expiry_date,
    icon_url: item.icon_url,
  }));

  const expiredCount = ingredients.filter(
    (i) => i.expiry_date && new Date(i.expiry_date).getTime() < now
  ).length;

  return <IngredientListClient ingredients={items} expiredCount={expiredCount} />;
}
