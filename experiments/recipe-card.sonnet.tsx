"use client";

// DanOS 换肤 · 设计决策:
// 1) 去掉原版"图片压满 + 黑色 scrim 压标题"的做法 —— DanOS 卡片解剖是「封面在上、留白在下」,
//    标题挪进白色卡体,用 10px overline(菜系)+ 13px semibold(标题)两档字号,呼应 app 卡头部语法。
// 2) 难度徽章按规范"功能色只做浅底徽章,不做饱和按钮":pastel 底(mint/butter/blush)+ 对应
//    功能色文字(ok/warn/danger),玻璃 chip 浮在封面右上角,不再是原来的纯色实心药丸。
// 3) 无封面兜底:抖掉高饱和随机渐变 + emoji,换成 DanOS 六色 pastel 组合渐变 + 线稿汤锅图标
//    (stroke 1.8,同一套 lucide 语汇),质感对齐 DanShots OSBookCard 的"无封面书脊"处理。
// 4) 食材 pill 用规范里 chips 未选中态的静态版(bg-pebble/30 + 描边),时长/人份用行内线稿图标
//    替代原来的实心 SVG,统一走 currentColor 继承。
// 5) 交互与 props 完全不动:整卡可点 onTap(recipe),hover 上浮 + 阴影加深,ease-spring 弹性曲线。

import { memo } from "react";
import type { Recipe } from "@/lib/ai-service";

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-mint text-ok",
  medium: "bg-butter text-warn",
  hard: "bg-blush text-danger",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

// DanOS 六色 pastel 点缀 —— 只做背景渐变,不承载文字
const GRADIENT_FALLBACKS = [
  "from-mint via-white to-sky",
  "from-blush via-white to-peach",
  "from-butter via-white to-mint",
  "from-lilac via-white to-blush",
  "from-sky via-white to-lilac",
  "from-peach via-white to-butter",
];

interface Props {
  recipe: Recipe;
  onTap: (recipe: Recipe) => void;
}

// 线稿汤锅图标(lucide 语汇,stroke 1.8)—— 无封面时的兜底插画
function SoupIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z" />
      <path d="M7 21h10" />
      <path d="M6.5 3c.3.35.75.9.5 1.7-.25.8-1 1.1-1 1.9s.5 1.1.9 1.55" />
      <path d="M11.5 3c.3.35.75.9.5 1.7-.25.8-1 1.1-1 1.9s.5 1.1.9 1.55" />
      <path d="M16.5 3c.3.35.75.9.5 1.7-.25.8-1 1.1-1 1.9s.5 1.1.9 1.55" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16.5 19.5v-1a3.5 3.5 0 0 0-3.5-3.5H7a3.5 3.5 0 0 0-3.5 3.5v1" />
      <circle cx="9.75" cy="8" r="2.85" />
      <path d="M20.5 19.5v-1a3.5 3.5 0 0 0-2.5-3.35" />
      <path d="M14.7 4.6a2.85 2.85 0 0 1 0 5.5" />
    </svg>
  );
}

export const RecipeCard = memo(function RecipeCard({ recipe, onTap }: Props) {
  const totalMinutes = recipe.prepTimeMinutes + recipe.cookTimeMinutes;
  const ingredientNames = recipe.ingredients.map((i) => i.name);
  const shown = ingredientNames.slice(0, 4);
  const remaining = ingredientNames.length - shown.length;

  // Stable gradient based on title (原逻辑不变,只是换了色板)
  const hash = recipe.title
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  const gradient = GRADIENT_FALLBACKS[hash % GRADIENT_FALLBACKS.length];

  const difficultyStyle =
    DIFFICULTY_STYLES[recipe.difficulty] ?? DIFFICULTY_STYLES.easy;
  const difficultyLabel =
    DIFFICULTY_LABELS[recipe.difficulty] ?? recipe.difficulty;

  return (
    <button
      type="button"
      onClick={() => onTap(recipe)}
      className="group w-full text-left rounded-3xl bg-surface overflow-hidden shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 ease-spring"
    >
      {/* 封面 */}
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
            <SoupIcon className="w-9 h-9 text-ink-soft/40" />
          </div>
        )}

        {/* 难度徽章 · 玻璃 chip + 功能色圆点,不用饱和按钮 */}
        <span
          className={`absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1 text-[10.5px] font-medium backdrop-blur-md bg-white/80 shadow-soft ${difficultyStyle}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {difficultyLabel}
        </span>
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-2">
        {/* overline: 菜系 */}
        <div className="text-[10px] uppercase tracking-wider text-ink-muted">
          {recipe.cuisine || "食谱"}
        </div>

        {/* 标题 */}
        <h3 className="text-[13px] font-semibold text-ink leading-snug line-clamp-2 -mt-1">
          {recipe.title}
        </h3>

        {recipe.description && (
          <p className="text-[11px] text-ink-soft leading-relaxed line-clamp-2">
            {recipe.description}
          </p>
        )}

        {/* meta: 时长 / 人份 */}
        <div className="flex items-center gap-2.5 text-[11px] text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            {totalMinutes} 分钟
          </span>
          {recipe.servings > 0 && (
            <>
              <span className="w-0.5 h-0.5 rounded-full bg-pebble" />
              <span className="inline-flex items-center gap-1">
                <UsersIcon className="w-3 h-3" />
                {recipe.servings} 人份
              </span>
            </>
          )}
        </div>

        {/* 食材 pill */}
        <div className="flex flex-wrap gap-1 pt-0.5">
          {shown.map((name) => (
            <span
              key={name}
              className="rounded-full bg-pebble/30 border border-pebble/60 px-2 py-0.5 text-[11px] text-ink-soft"
            >
              {name}
            </span>
          ))}
          {remaining > 0 && (
            <span className="rounded-full px-2 py-0.5 text-[11px] text-ink-muted">
              +{remaining}
            </span>
          )}
        </div>
      </div>
    </button>
  );
});
