"use client";

import { useCallback, useMemo, useState } from "react";
import { IngredientItem } from "./ingredient-item";
import { EditIngredientSheet, type EditableIngredient } from "./edit-ingredient-sheet";

const CATEGORY_FILTERS = [
  { value: "all", label: "全部" },
  { value: "vegetable", label: "蔬菜" },
  { value: "fruit", label: "水果" },
  { value: "protein", label: "蛋白质" },
  { value: "dairy", label: "乳制品" },
  { value: "grain", label: "谷物" },
  { value: "spice", label: "香料" },
  { value: "condiment", label: "调味品" },
  { value: "other", label: "其他" },
];

interface Props {
  ingredients: EditableIngredient[];
  expiredCount: number;
}

export function IngredientListClient({ ingredients, expiredCount }: Props) {
  const [editing, setEditing] = useState<EditableIngredient | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const handleClose = useCallback(() => setEditing(null), []);

  const filtered = useMemo(() => {
    let list = ingredients;
    if (categoryFilter !== "all") {
      list = list.filter((i) => i.category === categoryFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    return list;
  }, [ingredients, search, categoryFilter]);

  return (
    <>
      <p className="text-sm text-gray-400 mt-1 mb-4">
        共 {ingredients.length} 种食材
      </p>

      {expiredCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 mb-4">
          <span className="text-lg">⚠️</span>
          <p className="text-sm text-red-700">
            你有 <span className="font-semibold">{expiredCount}</span> 个食材已过期，建议尽快处理
          </p>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="search"
          autoComplete="off"
          name="ingredient-search"
          role="searchbox"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
          suppressHydrationWarning
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索食材..."
          className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none transition-colors"
        />
      </div>

      {/* Category filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3 -mx-1 px-1 scrollbar-hide">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setCategoryFilter(cat.value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              categoryFilter === cat.value
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
          {filtered.map((item) => (
            <IngredientItem
              key={item.id}
              id={item.id}
              name={item.name}
              category={item.category}
              quantity={item.quantity}
              unit={item.unit}
              expiry_date={item.expiry_date}
              icon_url={item.icon_url}
              onTap={() => setEditing(item)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-sm">
            {search || categoryFilter !== "all"
              ? "没有找到匹配的食材"
              : "暂无食材"}
          </p>
          {(search || categoryFilter !== "all") && (
            <button
              type="button"
              onClick={() => { setSearch(""); setCategoryFilter("all"); }}
              className="mt-2 text-sm text-gray-900 underline underline-offset-2"
            >
              清除筛选
            </button>
          )}
        </div>
      )}

      <EditIngredientSheet ingredient={editing} onClose={handleClose} />
    </>
  );
}
