"use client";

import { useState, useCallback, useMemo } from "react";
import type { Recipe } from "@/lib/ai-service";
import { RecipeDetailSheet } from "../../chat/_components/recipe-detail-sheet";
import { DeleteRecipeButton } from "./delete-recipe-button";

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-ok/10 text-ok",
  medium: "bg-warn/10 text-warn",
  hard: "bg-danger/10 text-danger",
};

const GRADIENT_FALLBACKS = [
  "from-mint to-sky",
  "from-blush to-peach",
  "from-butter to-peach",
  "from-lilac to-sky",
  "from-peach to-butter",
];

const TIME_PRESETS = [
  { label: "15分钟内", max: 15 },
  { label: "30分钟内", max: 30 },
  { label: "1小时内", max: 60 },
];

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

// ── Filter logic ──

interface Filters {
  search: string;
  cuisine: string | null;
  difficulty: string | null;
  maxMinutes: number | null;
  tags: string[];
}

function filterRecipes(items: SavedRecipeItem[], filters: Filters): SavedRecipeItem[] {
  return items.filter((item) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q) ?? false;
      if (!matchTitle && !matchDesc) return false;
    }
    if (filters.cuisine && item.cuisine !== filters.cuisine) return false;
    if (filters.difficulty && item.difficulty !== filters.difficulty) return false;
    if (filters.maxMinutes && item.totalMinutes > filters.maxMinutes) return false;
    if (filters.tags.length > 0) {
      const recipeTags = item.recipe.tags ?? [];
      if (!filters.tags.some((t) => recipeTags.includes(t))) return false;
    }
    return true;
  });
}

function extractOptions(items: SavedRecipeItem[]) {
  const cuisines = [...new Set(items.map((i) => i.cuisine).filter(Boolean))] as string[];
  const difficulties = [...new Set(items.map((i) => i.difficulty).filter(Boolean))] as string[];
  const tags = [...new Set(items.flatMap((i) => i.recipe.tags ?? []))];
  return { cuisines, difficulties, tags };
}

// ── Component ──

export function SavedRecipeList({ items }: Props) {
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [search, setSearch] = useState("");
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleClose = useCallback(() => setSelected(null), []);

  const options = useMemo(() => extractOptions(items), [items]);

  const filters: Filters = useMemo(
    () => ({ search, cuisine, difficulty, maxMinutes, tags: selectedTags }),
    [search, cuisine, difficulty, maxMinutes, selectedTags],
  );

  const filtered = useMemo(() => filterRecipes(items, filters), [items, filters]);

  const hasAnyFilter = search || cuisine || difficulty || maxMinutes || selectedTags.length > 0;

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const toggleSingle = <T,>(current: T | null, value: T, setter: (v: T | null) => void) => {
    setter(current === value ? null : value);
  };

  return (
    <>
      {/* Search */}
      <div className="relative mt-3 mb-3">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
          suppressHydrationWarning
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索食谱..."
          className="w-full rounded-xl border border-pebble bg-pebble/30 pl-9 pr-8 py-2.5 text-[12.5px] text-ink placeholder-ink-muted focus:border-ink/30 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-ink/20 transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-ink-muted hover:text-ink-soft"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="space-y-2 mb-4">
        {/* Cuisine */}
        {options.cuisines.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
            {options.cuisines.map((c) => (
              <Chip
                key={c}
                label={c}
                active={cuisine === c}
                onClick={() => toggleSingle(cuisine, c, setCuisine)}
              />
            ))}
          </div>
        )}

        {/* Difficulty + Time in one row */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {options.difficulties.map((d) => (
            <Chip
              key={d}
              label={DIFFICULTY_LABELS[d] ?? d}
              active={difficulty === d}
              onClick={() => toggleSingle(difficulty, d, setDifficulty)}
            />
          ))}
          {options.difficulties.length > 0 && TIME_PRESETS.length > 0 && (
            <div className="w-px bg-pebble shrink-0 my-1" />
          )}
          {TIME_PRESETS.map((tp) => (
            <Chip
              key={tp.max}
              label={tp.label}
              active={maxMinutes === tp.max}
              onClick={() => toggleSingle(maxMinutes, tp.max, setMaxMinutes)}
            />
          ))}
        </div>

        {/* Tags */}
        {options.tags.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
            {options.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                active={selectedTags.includes(tag)}
                onClick={() => toggleTag(tag)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Result count */}
      <p className="text-[11px] text-ink-muted mb-4">
        {hasAnyFilter
          ? `找到 ${filtered.length} 道食谱`
          : `共 ${items.length} 道收藏菜谱`}
      </p>

      {/* Recipe list */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((item) => {
            const shown = item.ingredientNames.slice(0, 4);
            const remaining = item.ingredientNames.length - shown.length;

            const coverUrl = item.recipe.coverImageUrl;
            const gradientIdx =
              item.title.split("").reduce((a, c) => a + c.charCodeAt(0), 0) %
              GRADIENT_FALLBACKS.length;

            return (
              <div
                key={item.savedId}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(item.recipe)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setSelected(item.recipe);
                }}
                className="rounded-3xl bg-surface ring-1 ring-black/5 shadow-soft overflow-hidden hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ease-spring cursor-pointer flex flex-row"
              >
                {/* Cover thumbnail */}
                <div className="w-24 md:w-32 shrink-0">
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${GRADIENT_FALLBACKS[gradientIdx]} flex items-center justify-center min-h-[80px]`}
                    >
                      <span className="text-2xl opacity-80">🍳</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 p-3 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="text-[13px] font-semibold text-ink leading-snug truncate">
                      {item.title}
                    </h3>
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.difficulty && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10.5px] font-medium ${
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
                    <p className="text-[11px] text-ink-muted mb-1.5 line-clamp-1">
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-ink-muted">
                    {item.totalMinutes > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3 2" />
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
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-ink-muted">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-[12px] mb-2">没找到相关食谱</p>
          {hasAnyFilter && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCuisine(null);
                setDifficulty(null);
                setMaxMinutes(null);
                setSelectedTags([]);
              }}
              className="text-[12px] text-ink underline underline-offset-2"
            >
              清除所有筛选
            </button>
          )}
        </div>
      )}

      <RecipeDetailSheet
        recipe={selected}
        onClose={handleClose}
        alreadySaved
      />
    </>
  );
}

// ── Chip component ──

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
        active
          ? "bg-ink text-white"
          : "bg-surface-dim text-ink-soft hover:bg-pebble active:bg-pebble"
      }`}
    >
      {label}
    </button>
  );
}
