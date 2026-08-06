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

  // Prevent body scroll when open + dynamic theme-color
  useEffect(() => {
    if (recipe) {
      document.body.style.overflow = "hidden";

      // Set dark theme-color when cover image is present
      const meta = document.querySelector('meta[name="theme-color"]');
      const original = meta?.getAttribute("content") ?? "#111827";
      if (recipe.coverImageUrl && meta) {
        meta.setAttribute("content", "#000000");
      }

      return () => {
        document.body.style.overflow = "";
        if (meta) meta.setAttribute("content", original);
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
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* 遮罩：点击关闭 */}
      <div
        className="absolute inset-0 bg-ink/20 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Sheet 面板 */}
      <div className="relative flex flex-col bg-surface rounded-t-3xl shadow-soft-lg max-h-[94vh] overflow-hidden">
        {/* Fixed header — sits above the scroll area, gradient scrim over cover image */}
        <div
          className={`absolute inset-x-0 top-0 z-10 ${
            recipe.coverImageUrl
              ? "bg-gradient-to-b from-ink/60 via-ink/30 to-transparent pt-3"
              : "bg-surface border-b border-pebble/60"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="返回"
              className={`rounded-full p-2 -m-2 transition-colors ${
                recipe.coverImageUrl
                  ? "text-white/95 hover:bg-white/20 active:bg-white/30"
                  : "text-ink-soft hover:bg-surface-dim active:bg-pebble"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 ${recipe.coverImageUrl ? "drop-shadow" : ""}`}>
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
            </button>
            <span className={`text-[13px] font-semibold ${recipe.coverImageUrl ? "text-white drop-shadow" : "text-ink"}`}>
              菜谱详情
            </span>
            <div className="w-9" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain touch-scroll">
          {/* Cover image (header is rendered separately, above this scroll container) */}
          {recipe.coverImageUrl ? (
            <div className="relative w-full h-48 md:h-[300px]">
              <img
                src={recipe.coverImageUrl}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            /* Spacer to clear the absolute header when there's no cover image */
            <div className="h-[56px]" />
          )}

          <div className="px-5 py-5 max-w-2xl mx-auto space-y-6">
            {/* Title & meta */}
            <div>
              <h1 className="text-[22px] font-bold text-ink mb-2">
                {recipe.title}
              </h1>
              <p className="text-sm text-ink-muted mb-3">{recipe.description}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                <span className="inline-flex items-center gap-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
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
                    className="rounded-full bg-pebble/40 px-2.5 py-0.5 text-xs text-ink-soft"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Ingredients */}
            <div>
              <h2 className="text-[13px] font-semibold text-ink mb-3">
                食材清单
              </h2>
              <div className="rounded-2xl border border-pebble/60 bg-pebble/10 divide-y divide-pebble/40">
                {recipe.ingredients.map((ing, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <span className="text-sm text-ink">{ing.name}</span>
                    <span className="text-sm text-ink-muted">
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
              <h2 className="text-[13px] font-semibold text-ink mb-3">
                烹饪步骤
              </h2>
              <div className="space-y-4">
                {recipe.steps.map((step) => (
                  <div key={step.order} className="flex gap-3">
                    <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-ink text-white text-xs font-medium">
                      {step.order}
                    </span>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm text-ink-soft leading-relaxed">
                        {step.instruction}
                      </p>
                      {step.tip && (
                        <p className="text-xs text-warn mt-1">
                          💡 {step.tip}
                        </p>
                      )}
                      {step.durationSeconds != null && step.durationSeconds > 0 && (
                        <p className="text-xs text-ink-muted mt-1">
                          约 {step.durationSeconds >= 60 ? `${Math.round(step.durationSeconds / 60)} 分钟` : `${step.durationSeconds} 秒`}
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
                <h2 className="text-[13px] font-semibold text-ink mb-3">
                  营养估算
                </h2>
                <div className="grid grid-cols-4 gap-2">
                  <div className="rounded-xl bg-mint/50 p-3 text-center">
                    <p className="text-lg font-semibold text-ink">
                      {recipe.nutritionEstimate.calories}
                    </p>
                    <p className="text-xs text-ink-muted">千卡</p>
                  </div>
                  <div className="rounded-xl bg-sky/50 p-3 text-center">
                    <p className="text-lg font-semibold text-ink">
                      {recipe.nutritionEstimate.proteinG}g
                    </p>
                    <p className="text-xs text-ink-muted">蛋白质</p>
                  </div>
                  <div className="rounded-xl bg-butter/50 p-3 text-center">
                    <p className="text-lg font-semibold text-ink">
                      {recipe.nutritionEstimate.carbsG}g
                    </p>
                    <p className="text-xs text-ink-muted">碳水</p>
                  </div>
                  <div className="rounded-xl bg-peach/50 p-3 text-center">
                    <p className="text-lg font-semibold text-ink">
                      {recipe.nutritionEstimate.fatG}g
                    </p>
                    <p className="text-xs text-ink-muted">脂肪</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Spacer for bottom bar */}
          <div className="h-20" />
        </div>

        {/* Bottom action bar */}
        <div className="shrink-0 border-t border-pebble/60 bg-surface px-4 py-3">
          {saveError && (
            <p className="text-xs text-danger text-center mb-2">{saveError}</p>
          )}
          <div className="flex gap-3 max-w-2xl mx-auto">
            <button
              type="button"
              onClick={() => setCooking(true)}
              className="flex-1 rounded-full bg-pebble/60 py-3 text-[13px] font-medium text-ink hover:bg-pebble active:bg-pebble/80 transition-colors"
            >
              开始制作
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || saved}
              className={`flex-1 rounded-full py-3 text-[13px] font-medium transition-colors ${
                saved
                  ? "bg-ok/10 text-ok border border-ok/20"
                  : "bg-ink text-white hover:bg-ink/90 active:bg-ink/80 disabled:opacity-50"
              }`}
            >
              {saved ? "已收藏" : saving ? "收藏中..." : "收藏"}
            </button>
          </div>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>

      {/* Cooking Mode overlay */}
      {cooking && (
        <CookingMode recipe={recipe} onClose={() => setCooking(false)} />
      )}
    </div>
  );
}
