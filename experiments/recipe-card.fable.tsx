"use client";

/* recipe-card · DanOS 重设计(Fable 版,归因实验 B 侧)
 * 设计决策:
 * 1. 标题撤出黑色压边浮层 → 卡身内 overline(菜系眉题)+ 13px semibold ink 标题,
 *    封面还给食物本身(DanOS「素材即封面」,参照音乐/想读卡)
 * 2. 难度徽章弃饱和彩色 → 白玻璃 pill + 功能色小圆点(ok/warn/danger),
 *    守「ink 是唯一强色/无彩色按钮」铁律,信息不丢气质不破
 * 3. 封面兜底渐变换 pastel token 对(mint/sky/blush/butter/lilac/peach),饱和度归位
 * 4. 卡壳 rounded-3xl + shadow-soft + ease-spring 悬浮;食材 pills 用 pebble 中性填充
 * 5. props/交互零改动(memo + onTap + hover scale 保留),纯换肤 */

import { memo } from "react";
import type { Recipe } from "@/lib/ai-service";

const DIFFICULTY_DOT: Record<string, string> = {
  easy: "bg-ok",
  medium: "bg-warn",
  hard: "bg-danger",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

/* pastel 双色兜底(DanOS 点缀色,低饱和邻近色相) */
const GRADIENT_FALLBACKS = [
  "from-mint to-sky",
  "from-blush to-peach",
  "from-butter to-peach",
  "from-lilac to-sky",
  "from-peach to-butter",
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

  const hash = recipe.title.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const gradient = GRADIENT_FALLBACKS[hash % GRADIENT_FALLBACKS.length];
  const emoji = FALLBACK_EMOJI[hash % FALLBACK_EMOJI.length];

  return (
    <button
      type="button"
      onClick={() => onTap(recipe)}
      className="group w-full text-left rounded-3xl bg-surface overflow-hidden ring-1 ring-black/5 shadow-soft hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ease-spring"
    >
      {/* 封面:干净的食物画面,不压字 */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {recipe.coverImageUrl ? (
          <img
            src={recipe.coverImageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <span className="text-5xl opacity-80 drop-shadow-sm">{emoji}</span>
          </div>
        )}

        {/* 难度:白玻璃 pill + 功能色小圆点(不做彩色按钮) */}
        <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur px-2 py-0.5 text-[10.5px] font-medium text-ink-soft shadow-sm">
          <span className={`w-1.5 h-1.5 rounded-full ${DIFFICULTY_DOT[recipe.difficulty] ?? DIFFICULTY_DOT.easy}`} />
          {DIFFICULTY_LABELS[recipe.difficulty] ?? recipe.difficulty}
        </span>
      </div>

      {/* 卡身:眉题 → 标题 → 元信息 → 简介 → 食材 */}
      <div className="p-3.5 space-y-1.5">
        {recipe.cuisine && (
          <div className="text-[10px] uppercase tracking-wider text-ink-muted">{recipe.cuisine}</div>
        )}
        <h3 className="text-[13px] font-semibold text-ink leading-snug">{recipe.title}</h3>

        <div className="flex items-center gap-2 text-[11px] text-ink-muted">
          <span className="inline-flex items-center gap-1">
            {/* 时钟(lucide 线稿,1.8) */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            {totalMinutes} 分钟
          </span>
          {recipe.servings > 0 && (
            <>
              <span className="w-0.5 h-0.5 rounded-full bg-pebble" />
              <span>{recipe.servings} 人份</span>
            </>
          )}
        </div>

        {recipe.description && (
          <p className="text-[11px] text-ink-muted leading-relaxed line-clamp-2">
            {recipe.description}
          </p>
        )}

        <div className="flex flex-wrap gap-1 pt-0.5">
          {shown.map((name) => (
            <span
              key={name}
              className="rounded-full bg-pebble/40 px-2 py-0.5 text-[11px] text-ink-soft"
            >
              {name}
            </span>
          ))}
          {remaining > 0 && (
            <span className="rounded-full px-2 py-0.5 text-[11px] text-ink-muted">+{remaining}</span>
          )}
        </div>
      </div>
    </button>
  );
});
