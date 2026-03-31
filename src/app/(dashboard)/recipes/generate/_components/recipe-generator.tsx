"use client";

import { memo, useCallback, useMemo, useState } from "react";

interface Ingredient {
  id: string;
  name: string;
  category: string;
  quantity: number | null;
  unit: string | null;
}

interface Props {
  ingredients: Ingredient[];
}

const IngredientTag = memo(function IngredientTag({
  name,
  quantity,
  unit,
}: {
  name: string;
  quantity: number | null;
  unit: string | null;
}) {
  return (
    <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
      {name}
      {quantity != null && (
        <span className="text-gray-400 ml-1">
          {quantity}
          {unit ?? ""}
        </span>
      )}
    </span>
  );
});

export function RecipeGenerator({ ingredients }: Props) {
  const [streaming, setStreaming] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  const ingredientNames = useMemo(
    () => ingredients.map((i) => i.name),
    [ingredients]
  );

  const generate = useCallback(async function generate() {
    setStreaming(true);
    setContent("");
    setError("");

    try {
      const res = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: ingredientNames }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data?.error === "string" ? data.error : "生成失败，请重试");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("无法读取响应");
        return;
      }

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setContent((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setStreaming(false);
    }
  }, [ingredientNames]);

  if (ingredients.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">🥦</p>
        <p className="text-sm">食材库还是空的，先去添加一些食材吧</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ingredients summary */}
      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <p className="text-sm font-medium text-gray-700 mb-3">
          当前食材库（{ingredients.length} 种）
        </p>
        <div className="flex flex-wrap gap-2">
          {ingredients.map((item) => (
            <IngredientTag
              key={item.id}
              name={item.name}
              quantity={item.quantity}
              unit={item.unit}
            />
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={streaming}
        className="w-full rounded-xl bg-gray-900 py-3.5 md:py-3 text-sm font-medium text-white hover:bg-gray-700 active:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {streaming ? "正在生成菜谱…" : "根据我的食材生成菜谱"}
      </button>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 rounded-lg bg-red-50 px-4 py-3">
          {error}
        </p>
      )}

      {/* Streamed output */}
      {(content || streaming) && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 md:p-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">
            AI 生成结果
          </p>
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed break-words">
            {content}
            {streaming && (
              <span className="inline-block w-1.5 h-4 bg-gray-400 ml-0.5 animate-pulse align-middle" />
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
