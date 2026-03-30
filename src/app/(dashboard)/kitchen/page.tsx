import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "./_components/delete-button";

const CATEGORY_LABELS: Record<string, string> = {
  vegetable: "蔬菜",
  fruit: "水果",
  protein: "蛋白质",
  dairy: "乳制品",
  grain: "谷物",
  spice: "香料",
  condiment: "调味品",
  other: "其他",
};

const CATEGORY_COLORS: Record<string, string> = {
  vegetable: "bg-green-50 text-green-700",
  fruit: "bg-orange-50 text-orange-700",
  protein: "bg-red-50 text-red-700",
  dairy: "bg-blue-50 text-blue-700",
  grain: "bg-yellow-50 text-yellow-700",
  spice: "bg-purple-50 text-purple-700",
  condiment: "bg-pink-50 text-pink-700",
  other: "bg-gray-100 text-gray-600",
};

export default async function KitchenPage() {
  const supabase = await createClient();
  const { data: ingredients } = await supabase
    .from("ingredients")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">食材库</h1>
          <p className="text-sm text-gray-400 mt-1">
            共 {ingredients?.length ?? 0} 种食材
          </p>
        </div>
        <Link
          href="/kitchen/add"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          + 添加食材
        </Link>
      </div>

      {/* Empty state */}
      {(!ingredients || ingredients.length === 0) && (
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
      )}

      {/* List */}
      {ingredients && ingredients.length > 0 && (
        <div className="space-y-2">
          {ingredients.map((item) => {
            const isExpiringSoon =
              item.expiry_date &&
              new Date(item.expiry_date) <
                new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
            const isExpired =
              item.expiry_date && new Date(item.expiry_date) < new Date();

            return (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white px-5 py-4 hover:border-gray-200 transition-colors"
              >
                {/* Category badge */}
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${
                    CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.other
                  }`}
                >
                  {CATEGORY_LABELS[item.category] ?? item.category}
                </span>

                {/* Name */}
                <span className="flex-1 text-sm font-medium text-gray-900">
                  {item.name}
                </span>

                {/* Quantity */}
                {item.quantity != null && (
                  <span className="text-sm text-gray-400">
                    {item.quantity} {item.unit ?? ""}
                  </span>
                )}

                {/* Expiry */}
                {item.expiry_date && (
                  <span
                    className={`text-xs ${
                      isExpired
                        ? "text-red-500"
                        : isExpiringSoon
                        ? "text-amber-500"
                        : "text-gray-400"
                    }`}
                  >
                    {isExpired ? "已过期 " : ""}
                    {item.expiry_date}
                  </span>
                )}

                <DeleteButton id={item.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
