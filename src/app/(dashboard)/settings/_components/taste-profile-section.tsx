"use client";

import { useState, useCallback } from "react";
import type { TasteProfile } from "@/lib/taste";
import { addTasteSignal, deleteTasteSignal, clearAllTasteData } from "../taste-actions";

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
    color: { like: "bg-orange-100 text-orange-800", dislike: "bg-red-100 text-red-800" },
  },
  {
    label: "菜系",
    likeType: "like_cuisine",
    dislikeType: "dislike_cuisine",
    likeKey: "liked_cuisines",
    dislikeKey: "disliked_cuisines",
    color: { like: "bg-purple-100 text-purple-800", dislike: "bg-red-100 text-red-800" },
  },
  {
    label: "食材",
    likeType: "like_ingredient",
    dislikeType: "dislike_ingredient",
    likeKey: "liked_ingredients",
    dislikeKey: "disliked_ingredients",
    color: { like: "bg-green-100 text-green-800", dislike: "bg-red-100 text-red-800" },
  },
  {
    label: "口味",
    likeType: "like_flavor",
    dislikeType: "dislike_flavor",
    likeKey: "liked_flavors",
    dislikeKey: "disliked_flavors",
    color: { like: "bg-amber-100 text-amber-800", dislike: "bg-red-100 text-red-800" },
  },
];

const STYLE_TYPES = [
  { label: "烹饪风格", type: "cooking_style", key: "cooking_styles" as keyof TasteProfile, color: "bg-blue-100 text-blue-800" },
  { label: "饮食目标", type: "dietary_goal", key: "dietary_goals" as keyof TasteProfile, color: "bg-teal-100 text-teal-800" },
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
        <h2 className="text-sm font-semibold text-gray-900">
          蛋厨对你的了解
        </h2>
        {hasAnyData && (
          <span className="text-xs text-gray-400">
            已学习 {profile.signal_count} 条信号
          </span>
        )}
      </div>

      {!hasAnyData ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-400 mb-1">还没有口味数据</p>
          <p className="text-xs text-gray-300">
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
                  <p className="text-xs font-medium text-gray-500">{cat.label}</p>
                  <button
                    type="button"
                    onClick={() => setAddMode(addMode === cat.likeType ? null : cat.likeType)}
                    className="text-xs text-gray-400 hover:text-gray-600"
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
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-gray-400 focus:outline-none"
                      onKeyDown={(e) => e.key === "Enter" && handleAdd(cat.likeType, cat.likeKey)}
                    />
                    <button
                      type="button"
                      onClick={() => handleAdd(cat.likeType, cat.likeKey)}
                      disabled={busy || !inputValue.trim()}
                      className="rounded-lg bg-gray-900 text-white px-3 py-1.5 text-xs disabled:opacity-50"
                    >
                      喜欢
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdd(cat.dislikeType, cat.dislikeKey)}
                      disabled={busy || !inputValue.trim()}
                      className="rounded-lg bg-red-50 text-red-700 px-3 py-1.5 text-xs disabled:opacity-50"
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
                <p className="text-xs font-medium text-gray-500 mb-2">{st.label}</p>
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
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleAdd("like_dish", "liked_dishes")}
          />
          <button
            type="button"
            onClick={() => handleAdd("like_dish", "liked_dishes")}
            disabled={busy || !inputValue.trim()}
            className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm disabled:opacity-50"
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
          className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
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
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
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
