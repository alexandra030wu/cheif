"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Recipe } from "@/lib/ai-service";
import { logCookedRecipe } from "@/app/(dashboard)/nutrition/actions";

interface Props {
  recipe: Recipe;
  onClose: () => void;
}

// ── Timer Hook ────────────────────────────────────────────────
function useTimer(totalSeconds: number) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(totalSeconds);
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [totalSeconds]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setRunning(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const toggle = useCallback(() => {
    if (remaining <= 0) {
      setRemaining(totalSeconds);
      setRunning(true);
    } else {
      setRunning((r) => !r);
    }
  }, [remaining, totalSeconds]);

  const reset = useCallback(() => {
    setRemaining(totalSeconds);
    setRunning(false);
  }, [totalSeconds]);

  return { remaining, running, finished: remaining <= 0, toggle, reset };
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ── TTS ───────────────────────────────────────────────────────
function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

// ── Swipe Hook ────────────────────────────────────────────────
function useSwipe(onLeft: () => void, onRight: () => void) {
  const startX = useRef(0);
  const startY = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = e.changedTouches[0].clientY - startY.current;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx > 0) onRight();
        else onLeft();
      }
    },
    [onLeft, onRight]
  );

  return { onTouchStart, onTouchEnd };
}

// ── Main Component ────────────────────────────────────────────
// 暗屏设计决策(2026-08-03,DanOS 换肤):厨房场景保持深色(暗光/防误触),
// 但色相从冷灰黑换成「暖墨暗面」#1c1a17 系 — DanOS 暖中性色的深色端。
// 此处为刻意的局部色板(不进全局 token);将来若做完整暗色系统再吸收。
export function CookingMode({ recipe, onClose }: Props) {
  const [step, setStep] = useState(0);
  const steps = recipe.steps;
  const total = steps.length;
  const current = steps[step];
  const durationSeconds = current.durationSeconds ?? 0;
  const hasTimer = durationSeconds > 0;

  const timer = useTimer(durationSeconds);

  // Speak step on change
  useEffect(() => {
    speak(current.instruction);
    return () => stopSpeaking();
  }, [current.instruction]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Alarm when timer finishes
  useEffect(() => {
    if (timer.finished && hasTimer) {
      speak("时间到！");
    }
  }, [timer.finished, hasTimer]);

  const goNext = useCallback(() => {
    setStep((s) => Math.min(s + 1, total - 1));
  }, [total]);

  const goPrev = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const swipe = useSwipe(goNext, goPrev);

  // 完成烹饪 → 记入今日营养（best-effort，不阻塞关闭）
  const handleFinish = useCallback(() => {
    void logCookedRecipe({
      title: recipe.title,
      nutrition: recipe.nutritionEstimate ?? null,
    }).catch(() => {});
    onClose();
  }, [recipe.title, recipe.nutritionEstimate, onClose]);

  const progress = ((step + 1) / total) * 100;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-[#1c1a17] text-[#f5f3ef] select-none"
      {...swipe}
    >
      {/* Progress bar */}
      <div
        className="shrink-0"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="h-1 bg-[#35312b]">
          <div
            className="h-full bg-[#f5f3ef] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 -m-2 text-[#a09a91] hover:text-[#f5f3ef] active:text-[#cfc9c0] transition-colors"
            aria-label="退出"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
          <span className="text-sm font-medium text-[#a09a91]">
            {recipe.title}
          </span>
          <span className="text-sm font-mono text-[#867f75]">
            {step + 1}/{total}
          </span>
        </div>
      </div>

      {/* Step content — main area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8 overflow-hidden">
        {/* Step number */}
        <div className="flex items-center justify-center w-14 h-14 rounded-full border-2 border-[#443f38] text-2xl font-bold text-[#cfc9c0]">
          {current.order}
        </div>

        {/* Instruction */}
        <p className="text-xl md:text-2xl font-medium leading-relaxed text-center max-w-lg">
          {current.instruction}
        </p>

        {/* Tip */}
        {current.tip && (
          <p className="text-sm text-[#e0bd7c] text-center max-w-md">
            💡 {current.tip}
          </p>
        )}

        {/* Timer */}
        {hasTimer && (
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={timer.toggle}
              className={`rounded-2xl px-8 py-4 text-3xl font-mono font-bold transition-colors ${
                timer.finished
                  ? "bg-ok text-white animate-pulse"
                  : timer.running
                  ? "bg-[#a8792b] text-white"
                  : "bg-[#2b2823] text-[#e5e1da] hover:bg-[#35312b] active:bg-[#403b34]"
              }`}
            >
              {timer.finished ? "时间到!" : formatTime(timer.remaining)}
            </button>
            <div className="flex items-center gap-4 text-xs text-[#867f75]">
              <span>
                {timer.running ? "点击暂停" : timer.finished ? "点击重置" : "点击开始计时"}
              </span>
              {(timer.running || timer.remaining !== durationSeconds) && !timer.finished && (
                <button
                  type="button"
                  onClick={timer.reset}
                  className="underline text-[#867f75] hover:text-[#cfc9c0]"
                >
                  重置
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation arrows + finish */}
      <div className="shrink-0 px-5 pb-5">
        {step === total - 1 ? (
          <button
            type="button"
            onClick={handleFinish}
            className="w-full rounded-2xl bg-[#f5f3ef] text-ink py-4 text-base font-semibold active:bg-[#e2ddd4] transition-colors"
          >
            完成烹饪
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={goPrev}
              disabled={step === 0}
              className="flex-1 rounded-2xl border border-[#443f38] py-4 text-base font-medium text-[#cfc9c0] disabled:opacity-20 active:bg-[#2b2823] transition-colors"
            >
              上一步
            </button>
            <button
              type="button"
              onClick={goNext}
              className="flex-1 rounded-2xl bg-[#f5f3ef] text-ink py-4 text-base font-semibold active:bg-[#e2ddd4] transition-colors"
            >
              下一步
            </button>
          </div>
        )}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}
