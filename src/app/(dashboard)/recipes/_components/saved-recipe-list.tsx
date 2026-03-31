"use client";

import { useState, useCallback } from "react";
import type { Recipe } from "@/lib/ai-service";
import { RecipeDetailSheet } from "../../chat/_components/recipe-detail-sheet";
import { DeleteRecipeButton } from "./delete-recipe-button";

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

export interface SavedRecipeItem {
  savedId: string;
  recipe: Recipe;
  title: string;
  description: string | null;
  difficulty: string | null;
  cuisine: string | null;
  totalMinutes: number;
  ingredientNames: string[];
}

interface Props {
  items: SavedRecipeItem[];
}

export function SavedRecipeList({ items }: Props) {
  const [selected, setSelected] = useState<Recipe | null>(null);

  const handleClose = useCallback(() => setSelected(null), []);

  return (
    <>
      <p className="text-sm text-gray-400 mt-1 mb-6">
        共 {items.length} 道收藏菜谱
      </p>
      <div className="space-y-3">
        {items.map((item) => {
          const shown = item.ingredientNames.slice(0, 4);
          const remaining = item.ingredientNames.length - shown.length;

          return (
            <div
              key={item.savedId}
              role="button"
              tabIndex={0}
              onClick={() => setSelected(item.recipe)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSelected(item.recipe);
              }}
              className="rounded-xl border border-gray-100 bg-white p-4 hover:border-gray-200 active:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-gray-900 leading-snug">
                  {item.title}
                </h3>
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.difficulty && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${
                        DIFFICULTY_STYLES[item.difficulty] ?? DIFFICULTY_STYLES.easy
                      }`}
                    >
                      {DIFFICULTY_LABELS[item.difficulty] ?? item.difficulty}
                    </span>
                  )}
                  <DeleteRecipeButton id={item.savedId} />
                </div>
              </div>

              {item.description && (
                <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                  {item.description}
                </p>
              )}

              <div className="flex items-center gap-3 text-xs text-gray-400">
                {item.totalMinutes > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" />
                    </svg>
                    {item.totalMinutes} 分钟
                  </span>
                )}
                {item.cuisine && <span>{item.cuisine}</span>}
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

      {/* Reuse the chat detail sheet — already saved so it shows "已收藏" */}
      <RecipeDetailSheet
        recipe={selected}
        onClose={handleClose}
        alreadySaved
      />
    </>
  );
}
