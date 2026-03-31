"use client";

import { memo } from "react";
import type { Recipe } from "@/lib/ai-service";

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-green-50 text-green-700",
  medium: "bg-amber-50 text-amber-700",
  hard: "bg-red-50 text-red-700",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

interface Props {
  recipe: Recipe;
  onTap: (recipe: Recipe) => void;
}

export const RecipeCard = memo(function RecipeCard({ recipe, onTap }: Props) {
  const totalMinutes = recipe.prepTimeMinutes + recipe.cookTimeMinutes;
  const ingredientNames = recipe.ingredients.map((i) => i.name);
  const shown = ingredientNames.slice(0, 4);
  const remaining = ingredientNames.length - shown.length;
  const usesUrgent = recipe.tags.includes("消耗临期食材");

  return (
    <button
      type="button"
      onClick={() => onTap(recipe)}
      className="w-full text-left rounded-xl border border-gray-100 bg-white p-4 hover:border-gray-200 active:bg-gray-50 transition-colors shadow-sm"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug">
          {recipe.title}
        </h3>
        <span
          className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium ${
            DIFFICULTY_STYLES[recipe.difficulty] ?? DIFFICULTY_STYLES.easy
          }`}
        >
          {DIFFICULTY_LABELS[recipe.difficulty] ?? recipe.difficulty}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-400 mb-2.5">
        <span className="inline-flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" />
          </svg>
          {totalMinutes} 分钟
        </span>
        {recipe.cuisine && (
          <span>{recipe.cuisine}</span>
        )}
      </div>

      {usesUrgent && (
        <span className="inline-block rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium mb-2">
          🔥 消耗临期食材
        </span>
      )}

      <p className="text-xs text-gray-500 leading-relaxed">
        {shown.join("、")}
        {remaining > 0 && (
          <span className="text-gray-400"> +{remaining} 种食材</span>
        )}
      </p>
    </button>
  );
});
