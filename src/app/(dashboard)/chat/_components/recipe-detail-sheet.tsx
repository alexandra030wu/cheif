"use client";

import { useEffect, useState } from "react";
import type { Recipe } from "@/lib/ai-service";
import { CookingMode } from "./cooking-mode";

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

interface Props {
  recipe: Recipe | null;
  onClose: () => void;
  alreadySaved?: boolean;
}

export function RecipeDetailSheet({ recipe, onClose, alreadySaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [cooking, setCooking] = useState(false);

  // Prevent body scroll when open
  useEffect(() => {
    if (recipe) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [recipe]);

  // Reset state when recipe changes
  useEffect(() => {
    setSaved(alreadySaved ?? false);
    setSaveError("");
    setCooking(false);
  }, [recipe, alreadySaved]);

  if (!recipe) return null;

  const totalMinutes = recipe.prepTimeMinutes + recipe.cookTimeMinutes;

  async function handleSave() {
    if (!recipe || saving || saved) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/recipes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipe),
      });
      if (res.ok) {
        setSaved(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setSaveError(typeof data?.error === "string" ? data.error : "收藏失败，请重试");
      }
    } catch {
      setSaveError("网络错误，请重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-900">菜谱详情</span>
        <div className="w-8" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Cover image */}
        {recipe.coverImageUrl && (
          <div className="w-full aspect-[2/1] max-h-56">
            <img
              src={recipe.coverImageUrl}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="px-5 py-5 max-w-2xl mx-auto space-y-6">
          {/* Title & meta */}
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {recipe.title}
            </h1>
            <p className="text-sm text-gray-500 mb-3">{recipe.description}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" />
                </svg>
                {totalMinutes} 分钟
              </span>
              <span>
                {DIFFICULTY_LABELS[recipe.difficulty] ?? recipe.difficulty}
              </span>
              {recipe.cuisine && <span>{recipe.cuisine}</span>}
              <span>{recipe.servings} 人份</span>
            </div>
          </div>

          {/* Tags */}
          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recipe.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Ingredients */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              食材清单
            </h2>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 divide-y divide-gray-100">
              {recipe.ingredients.map((ing, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <span className="text-sm text-gray-800">{ing.name}</span>
                  <span className="text-sm text-gray-400">
                    {ing.amount} {ing.unit}
                    {ing.notes && (
                      <span className="ml-1 text-xs">({ing.notes})</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              烹饪步骤
            </h2>
            <div className="space-y-4">
              {recipe.steps.map((step) => (
                <div key={step.order} className="flex gap-3">
                  <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-medium">
                    {step.order}
                  </span>
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {step.instruction}
                    </p>
                    {step.durationMinutes && (
                      <p className="text-xs text-gray-400 mt-1">
                        约 {step.durationMinutes} 分钟
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nutrition */}
          {recipe.nutritionEstimate && (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                营养估算
              </h2>
              <div className="grid grid-cols-4 gap-2">
                {recipe.nutritionEstimate.calories != null && (
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-lg font-semibold text-gray-900">
                      {recipe.nutritionEstimate.calories}
                    </p>
                    <p className="text-xs text-gray-400">千卡</p>
                  </div>
                )}
                {recipe.nutritionEstimate.protein && (
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-lg font-semibold text-gray-900">
                      {recipe.nutritionEstimate.protein}
                    </p>
                    <p className="text-xs text-gray-400">蛋白质</p>
                  </div>
                )}
                {recipe.nutritionEstimate.carbs && (
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-lg font-semibold text-gray-900">
                      {recipe.nutritionEstimate.carbs}
                    </p>
                    <p className="text-xs text-gray-400">碳水</p>
                  </div>
                )}
                {recipe.nutritionEstimate.fat && (
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-lg font-semibold text-gray-900">
                      {recipe.nutritionEstimate.fat}
                    </p>
                    <p className="text-xs text-gray-400">脂肪</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Spacer for bottom bar */}
        <div className="h-20" />
      </div>

      {/* Bottom action bar */}
      <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3">
        {saveError && (
          <p className="text-xs text-red-500 text-center mb-2">{saveError}</p>
        )}
        <div className="flex gap-3 max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => setCooking(true)}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            开始制作
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || saved}
            className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${
              saved
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-gray-900 text-white hover:bg-gray-700 active:bg-gray-800 disabled:opacity-50"
            }`}
          >
            {saved ? "已收藏" : saving ? "收藏中..." : "收藏"}
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>

      {/* Cooking Mode overlay */}
      {cooking && (
        <CookingMode recipe={recipe} onClose={() => setCooking(false)} />
      )}
    </div>
  );
}
