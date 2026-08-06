"use client";

import { useState, useCallback } from "react";
import type { TasteProfile } from "@/lib/taste";
import { addTasteSignal, deleteTasteSignal, clearAllTasteData } from "../taste-actions";

// 统一用 ink/danger 两色区分「喜欢」与「不爱」，不再按类目分配彩色——
// 与 DanOS 铁律一致：可点的东西只用墨色，功能色只做浅底徽章。
const SIGNAL_CATEGORIES: {
  label: string;
  likeType: string;
  dislikeType: string;
  likeKey: keyof TasteProfile;
  dislikeKey: keyof TasteProfile;
  color: { like: string; dislike: string };
}[] = [
  {
    label: "菜品",
    likeType: "like_dish",
    dislikeType: "dislike_dish",
    likeKey: "liked_dishes",
    dislikeKey: "disliked_dishes",
    color: { like: "bg-surface-dim text-ink-soft", dislike: "bg-danger/10 text-danger" },
  },
  {
    label: "菜系",
    likeType: "like_cuisine",
    dislikeType: "dislike_cuisine",
    likeKey: "liked_cuisines",
    dislikeKey: "disliked_cuisines",
    color: { like: "bg-surface-dim text-ink-soft", dislike: "bg-danger/10 text-danger" },
  },
  {
    label: "食材",
    likeType: "like_ingredient",
    dislikeType: "dislike_ingredient",
    likeKey: "liked_ingredients",
    dislikeKey: "disliked_ingredients",
    color: { like: "bg-surface-dim text-ink-soft", dislike: "bg-danger/10 text-danger" },
  },
  {
    label: "口味",
    likeType: "like_flavor",
    dislikeType: "dislike_flavor",
    likeKey: "liked_flavors",
    dislikeKey: "disliked_flavors",
    color: { like: "bg-surface-dim text-ink-soft", dislike: "bg-danger/10 text-danger" },
  },
];

const STYLE_TYPES = [
  { label: "烹饪风格", type: "cooking_style", key: "cooking_styles" as keyof TasteProfile, color: "bg-surface-dim text-ink-soft" },
  { label: "饮食目标", type: "dietary_goal", key: "dietary_goals" as keyof TasteProfile, color: "bg-surface-dim text-ink-soft" },
];

interface Props {
  profile: TasteProfile;
}

export function TasteProfileSection({ profile: initialProfile }: Props) {
  const [profile, setProfile] = useState(initialProfile);
  const [addMode, setAddMode] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [busy, setBusy] = useState(false);

  const handleDelete = useCallback(async (signalType: string, value: string, key: keyof TasteProfile) => {
    setBusy(true);
    const result = await deleteTasteSignal(signalType, value);
    if (result.status === "success") {
      setProfile((prev) => ({
        ...prev,
        [key]: (prev[key] as string[]).filter((v) => v !== value),
        signal_count: Math.max(0, prev.signal_count - 1),
      }));
    }
    setBusy(false);
  }, []);

  const handleAdd = useCallback(async (signalType: string, key: keyof TasteProfile) => {
    const value = inputValue.trim();
    if (!value) return;
    setBusy(true);
    const result = await addTasteSignal(signalType, value);
    if (result.status === "success") {
      setProfile((prev) => ({
        ...prev,
        [key]: [...(prev[key] as string[]), value],
        signal_count: prev.signal_count + 1,
      }));
    }
    setInputValue("");
    setAddMode(null);
    setBusy(false);
  }, [inputValue]);

  const handleClearAll = useCallback(async () => {
    if (!confirm("确定要清空所有口味数据吗？")) return;
    setBusy(true);
    const result = await clearAllTasteData();
    if (result.status === "success") {
      setProfile({
        liked_dishes: [],
        disliked_dishes: [],
        liked_cuisines: [],
        disliked_cuisines: [],
        liked_ingredients: [],
        disliked_ingredients: [],
        liked_flavors: [],
        disliked_flavors: [],
        cooking_styles: [],
        dietary_goals: [],
        signal_count: 0,
        last_updated: "",
      });
    }
    setBusy(false);
  }, []);

  const hasAnyData = profile.signal_count > 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-ink">
          蛋厨对你的了解
        </h2>
        {hasAnyData && (
          <span className="text-[11px] text-ink-muted">
            已学习 {profile.signal_count} 条信号
          </span>
        )}
      </div>

      {!hasAnyData ? (
        <div className="rounded-xl border border-dashed border-pebble p-6 text-center">
          <p className="text-[12.5px] text-ink-muted mb-1">还没有口味数据</p>
          <p className="text-[11px] text-ink-muted/70">
            和蛋厨多聊聊，TA 会慢慢了解你的口味
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Like/Dislike categories */}
          {SIGNAL_CATEGORIES.map((cat) => {
            const likes = profile[cat.likeKey] as string[];
            const dislikes = profile[cat.dislikeKey] as string[];
            if (likes.length === 0 && dislikes.length === 0) return null;
            return (
              <div key={cat.label}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-medium text-ink-soft">{cat.label}</p>
                  <button
                    type="button"
                    onClick={() => setAddMode(addMode === cat.likeType ? null : cat.likeType)}
                    className="text-[11px] text-ink-muted hover:text-ink-soft"
                    disabled={busy}
                  >
                    + 添加
                  </button>
                </div>

                {addMode === cat.likeType && (
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={`输入${cat.label}名称`}
                      className="flex-1 rounded-lg bg-pebble/30 px-3 py-1.5 text-[12px] text-ink placeholder-ink-muted focus:ring-1 focus:ring-ink/20 focus:outline-none"
                      onKeyDown={(e) => e.key === "Enter" && handleAdd(cat.likeType, cat.likeKey)}
                    />
                    <button
                      type="button"
                      onClick={() => handleAdd(cat.likeType, cat.likeKey)}
                      disabled={busy || !inputValue.trim()}
                      className="rounded-lg bg-ink text-white px-3 py-1.5 text-[11px] disabled:opacity-50"
                    >
                      喜欢
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdd(cat.dislikeType, cat.dislikeKey)}
                      disabled={busy || !inputValue.trim()}
                      className="rounded-lg bg-danger/10 text-danger px-3 py-1.5 text-[11px] disabled:opacity-50"
                    >
                      不爱
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {likes.map((v) => (
                    <Chip
                      key={`like-${v}`}
                      label={v}
                      className={cat.color.like}
                      onDelete={() => handleDelete(cat.likeType, v, cat.likeKey)}
                      disabled={busy}
                    />
                  ))}
                  {dislikes.map((v) => (
                    <Chip
                      key={`dislike-${v}`}
                      label={v}
                      prefix="不爱"
                      className={cat.color.dislike}
                      onDelete={() => handleDelete(cat.dislikeType, v, cat.dislikeKey)}
                      disabled={busy}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Style categories */}
          {STYLE_TYPES.map((st) => {
            const values = profile[st.key] as string[];
            if (values.length === 0) return null;
            return (
              <div key={st.label}>
                <p className="text-[11px] font-medium text-ink-soft mb-2">{st.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {values.map((v) => (
                    <Chip
                      key={v}
                      label={v}
                      className={st.color}
                      onDelete={() => handleDelete(st.type, v, st.key)}
                      disabled={busy}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual add for empty state */}
      {!hasAnyData && (
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="输入喜欢的菜、口味..."
            className="flex-1 rounded-lg bg-pebble/30 px-3 py-2 text-[12px] text-ink placeholder-ink-muted focus:ring-1 focus:ring-ink/20 focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleAdd("like_dish", "liked_dishes")}
          />
          <button
            type="button"
            onClick={() => handleAdd("like_dish", "liked_dishes")}
            disabled={busy || !inputValue.trim()}
            className="rounded-full bg-ink text-white px-4 py-2 text-[12px] disabled:opacity-50"
          >
            添加
          </button>
        </div>
      )}

      {/* Clear all */}
      {hasAnyData && (
        <button
          type="button"
          onClick={handleClearAll}
          disabled={busy}
          className="text-[11px] text-ink-muted hover:text-danger transition-colors disabled:opacity-50"
        >
          清空所有口味数据
        </button>
      )}
    </section>
  );
}

// ── Chip component ──

function Chip({
  label,
  prefix,
  className,
  onDelete,
  disabled,
}: {
  label: string;
  prefix?: string;
  className: string;
  onDelete: () => void;
  disabled: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-medium ${className}`}
    >
      {prefix && <span className="opacity-60">{prefix}:</span>}
      {label}
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        className="ml-0.5 opacity-50 hover:opacity-100 disabled:opacity-30"
        aria-label={`删除 ${label}`}
      >
        &times;
      </button>
    </span>
  );
}
