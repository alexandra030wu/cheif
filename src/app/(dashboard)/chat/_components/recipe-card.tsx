"use client";

import { memo } from "react";
import type { Recipe } from "@/lib/ai-service";

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-emerald-500/90 text-white",
  medium: "bg-amber-500/90 text-white",
  hard: "bg-rose-500/90 text-white",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

const GRADIENT_FALLBACKS = [
  "from-amber-200 via-orange-100 to-yellow-50",
  "from-emerald-200 via-green-100 to-teal-50",
  "from-sky-200 via-blue-100 to-cyan-50",
  "from-violet-200 via-purple-100 to-fuchsia-50",
  "from-rose-200 via-pink-100 to-red-50",
];

const FALLBACK_EMOJI = ["🍳", "🥗", "🍜", "🍲", "🥘"];

interface Props {
  recipe: Recipe;
  onTap: (recipe: Recipe) => void;
}

export const RecipeCard = memo(function RecipeCard({ recipe, onTap }: Props) {
  const totalMinutes = recipe.prepTimeMinutes + recipe.cookTimeMinutes;
  const ingredientNames = recipe.ingredients.map((i) => i.name);
  const shown = ingredientNames.slice(0, 4);
  const remaining = ingredientNames.length - shown.length;

  // Stable gradient / emoji based on title
  const hash = recipe.title
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  const gradient = GRADIENT_FALLBACKS[hash % GRADIENT_FALLBACKS.length];
  const emoji = FALLBACK_EMOJI[hash % FALLBACK_EMOJI.length];

  return (
    <button
      type="button"
      onClick={() => onTap(recipe)}
      className="group w-full text-left rounded-2xl bg-white overflow-hidden ring-1 ring-black/5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all duration-200"
    >
      {/* Cover with title scrim overlay */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {recipe.coverImageUrl ? (
          <img
            src={recipe.coverImageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}
          >
            <span className="text-5xl opacity-70 drop-shadow-sm">{emoji}</span>
          </div>
        )}

        {/* Bottom gradient scrim + title */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pt-10 pb-2.5 px-3">
          <h3 className="text-white text-[15px] font-bold leading-snug drop-shadow-sm">
            {recipe.title}
          </h3>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white/80">
            <span className="inline-flex items-center gap-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" />
              </svg>
              {totalMinutes} 分钟
            </span>
            {recipe.cuisine && (
              <>
                <span className="w-0.5 h-0.5 rounded-full bg-white/50" />
                <span>{recipe.cuisine}</span>
              </>
            )}
            {recipe.servings > 0 && (
              <>
                <span className="w-0.5 h-0.5 rounded-full bg-white/50" />
                <span>{recipe.servings} 人份</span>
              </>
            )}
          </div>
        </div>

        {/* Difficulty badge */}
        <span
          className={`absolute top-2.5 right-2.5 rounded-full px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm shadow-sm ${
            DIFFICULTY_STYLES[recipe.difficulty] ?? DIFFICULTY_STYLES.easy
          }`}
        >
          {DIFFICULTY_LABELS[recipe.difficulty] ?? recipe.difficulty}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {recipe.description && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
            {recipe.description}
          </p>
        )}

        {/* Ingredient pills */}
        <div className="flex flex-wrap gap-1">
          {shown.map((name) => (
            <span
              key={name}
              className="rounded-full bg-gray-50 ring-1 ring-gray-100 px-2 py-0.5 text-[11px] text-gray-600"
            >
              {name}
            </span>
          ))}
          {remaining > 0 && (
            <span className="rounded-full px-2 py-0.5 text-[11px] text-gray-400">
              +{remaining}
            </span>
          )}
        </div>
      </div>
    </button>
  );
});
