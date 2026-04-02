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
    <div className="px-4 py-6 md:p-8 max-w-lg pt-14">
      {/* Header */}
      <div className="mb-6">
        {mode ? (
          <button
            type="button"
            onClick={() => setMode(null)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← 返回选择
          </button>
        ) : (
          <Link
            href="/kitchen"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← 返回食材库
          </Link>
        )}
        <h1 className="text-2xl font-bold text-gray-900 mt-3">添加食材</h1>
      </div>

      {/* Content */}
      {mode === null && (
        <ModeSelector onSelect={setMode} />
      )}

      {mode === "manual" && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-6">
          <AddIngredientForm onBack={() => setMode(null)} />
        </div>
      )}

      {mode === "voice" && (
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <p className="text-3xl mb-2">🎤</p>
                <p className="text-sm text-gray-400">加载中...</p>
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
