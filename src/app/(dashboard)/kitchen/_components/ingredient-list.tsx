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
      <div className="text-center py-16 text-ink-muted">
        <p className="text-4xl mb-3">🥦</p>
        <p className="text-[12px]">还没有食材，先添加几样吧</p>
        <Link
          href="/kitchen/add"
          className="mt-4 inline-block text-[12px] text-ink underline underline-offset-2"
        >
          添加第一个食材
        </Link>
      </div>
    );
  }

  // DIRECTION-v2 §5.1: stop sorting by expiry urgency. Server already returned
  // the list ordered by created_at desc — most-recently-added ingredients show
  // first, which matches the new "what did I just buy" mental model.
  const items = ingredients.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    expiry_date: item.expiry_date,
    icon_url: item.icon_url,
  }));

  const expiredCount = ingredients.filter(
    (i) => i.expiry_date && new Date(i.expiry_date).getTime() < Date.now()
  ).length;

  return <IngredientListClient ingredients={items} expiredCount={expiredCount} />;
}
