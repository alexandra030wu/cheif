"use client";

import { useState, lazy, Suspense } from "react";
import Link from "next/link";
import { ModeSelector, type InputMode } from "../_components/mode-selector";
import { AddIngredientForm } from "../_components/add-form";

const VoiceInput = lazy(() =>
  import("../_components/voice-input").then((m) => ({ default: m.VoiceInput }))
);

export default function AddIngredientPage() {
  const [mode, setMode] = useState<InputMode | null>(null);

  return (
    <div className="px-4 py-6 md:p-8 max-w-lg pt-14 bg-canvas">
      {/* Header */}
      <div className="mb-6">
        {mode ? (
          <button
            type="button"
            onClick={() => setMode(null)}
            className="text-xs text-ink-muted hover:text-ink-soft transition-colors"
          >
            ← 返回选择
          </button>
        ) : (
          <Link
            href="/kitchen"
            className="text-xs text-ink-muted hover:text-ink-soft transition-colors"
          >
            ← 返回食材库
          </Link>
        )}
        <h1 className="text-[22px] font-bold text-ink mt-3">添加食材</h1>
      </div>

      {/* Content */}
      {mode === null && (
        <ModeSelector onSelect={setMode} />
      )}

      {mode === "manual" && (
        <div className="rounded-3xl bg-surface shadow-soft p-4 md:p-6">
          <AddIngredientForm onBack={() => setMode(null)} />
        </div>
      )}

      {mode === "voice" && (
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <p className="text-3xl mb-2">🎤</p>
                <p className="text-[11px] text-ink-muted">加载中...</p>
              </div>
            </div>
          }
        >
          <VoiceInput onBack={() => setMode(null)} />
        </Suspense>
      )}
    </div>
  );
}
