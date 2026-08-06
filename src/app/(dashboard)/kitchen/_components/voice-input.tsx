"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { bulkAddIngredients } from "../actions";
import { IngredientConfirmList, type ConfirmItem } from "./ingredient-confirm-list";

interface Props {
  onBack: () => void;
}

type MicStatus = "idle" | "recording" | "processing";

interface VoiceAction {
  type: "add" | "update" | "remove";
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
  expiry_date?: string;
  matchName?: string;
}

export function VoiceInput({ onBack }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<ConfirmItem[]>([]);
  const [micStatus, setMicStatus] = useState<MicStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const processedIndexRef = useRef(0);
  const queueRef = useRef<string[]>([]);
  const processingRef = useRef(false);
  const itemsRef = useRef<ConfirmItem[]>([]);
  const stoppedByUserRef = useRef(false);

  // Keep itemsRef in sync
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // ── Queue processor ──────────────────────────────────────────
  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) return;
    processingRef.current = true;

    while (queueRef.current.length > 0) {
      const segment = queueRef.current.shift()!;
      setPendingCount(queueRef.current.length);

      try {
        const currentItems = itemsRef.current
          .filter((i) => i.checked)
          .map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit }));

        const res = await fetch("/api/ingredients/parse-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: segment, currentItems }),
        });

        if (!res.ok) continue;

        const data = (await res.json()) as { actions: VoiceAction[] };

        if (data.actions.length > 0) {
          setItems((prev) => applyActions(prev, data.actions));
        }
      } catch {
        // best-effort, skip failed segments
      }
    }

    setPendingCount(0);
    processingRef.current = false;
  }, []);

  // ── Speech recognition ───────────────────────────────────────
  const startRecognition = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const SpeechRecognitionCtor = w.SpeechRecognition ?? w.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setError("当前浏览器不支持语音输入，请使用手动模式");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const recognition = new SpeechRecognitionCtor();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    recognition.lang = "zh-CN";
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    recognition.continuous = true;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    processedIndexRef.current = 0;
    stoppedByUserRef.current = false;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    recognition.onresult = (e: {
      results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
    }) => {
      // Show interim results in transcript area
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i];
        if (!result.isFinal) {
          interim += (result[0] as { transcript: string }).transcript;
        }
      }
      if (interim) setTranscript(interim);

      // Process final results
      for (let i = processedIndexRef.current; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          const text = (result[0] as { transcript: string }).transcript;
          processedIndexRef.current = i + 1;
          setTranscript(text);
          // Enqueue for AI parsing
          queueRef.current.push(text);
          setPendingCount(queueRef.current.length);
          void processQueue();
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    recognition.onerror = () => {
      // Auto-restart on non-fatal errors
      if (!stoppedByUserRef.current) {
        setTimeout(() => {
          if (!stoppedByUserRef.current) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              recognition.start();
            } catch {
              setMicStatus("idle");
            }
          }
        }, 500);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    recognition.onend = () => {
      // Auto-restart if user hasn't explicitly stopped
      if (!stoppedByUserRef.current) {
        setTimeout(() => {
          if (!stoppedByUserRef.current) {
            try {
              processedIndexRef.current = 0;
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              recognition.start();
            } catch {
              setMicStatus("idle");
            }
          }
        }, 300);
      } else {
        setMicStatus("idle");
      }
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      recognition.start();
      setMicStatus("recording");
      setError(null);
    } catch {
      setError("无法启动语音识别，请检查麦克风权限");
    }
  }, [processQueue]);

  const stopRecognition = useCallback(() => {
    stoppedByUserRef.current = true;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    recognitionRef.current?.stop();
    setMicStatus("idle");
  }, []);

  const toggleMic = useCallback(() => {
    if (micStatus === "recording") {
      stopRecognition();
    } else {
      startRecognition();
    }
  }, [micStatus, startRecognition, stopRecognition]);

  // Auto-start on mount
  useEffect(() => {
    const timer = setTimeout(() => startRecognition(), 500);
    return () => {
      clearTimeout(timer);
      stoppedByUserRef.current = true;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      recognitionRef.current?.stop();
    };
  }, [startRecognition]);

  // ── Item management ──────────────────────────────────────────
  const handleUpdate = useCallback((id: string, updates: Partial<ConfirmItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }, []);

  const handleRemove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleToggle = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
    );
  }, []);

  const handleSave = useCallback(async () => {
    const toSave = itemsRef.current.filter((i) => i.checked);
    if (toSave.length === 0) return;

    setSaving(true);
    const result = await bulkAddIngredients(
      toSave.map((i) => ({
        name: i.name,
        category: i.category,
        quantity: i.quantity,
        unit: i.unit,
        expiry_date: i.expiry_date,
      })),
    );
    setSaving(false);

    if (result.status === "success") {
      const savedIds = new Set(toSave.map((i) => i.id));
      setItems((prev) => prev.filter((i) => !savedIds.has(i.id)));
      setSavedCount((c) => c + result.count);
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onBack}
          className="text-[11px] text-ink-muted hover:text-ink-soft transition-colors"
        >
          ← 返回选择
        </button>
        <h2 className="text-[15px] font-semibold text-ink">语音添加</h2>
        <div className="w-16" />
      </div>

      {error && (
        <p className="text-[12px] text-danger bg-danger/10 px-3 py-2 rounded-lg mb-3">{error}</p>
      )}

      {/* Mic status area */}
      <div className="flex items-center gap-3 rounded-xl border border-pebble/60 bg-surface-dim/50 px-4 py-3 mb-4">
        {/* Mic button */}
        <button
          type="button"
          onClick={toggleMic}
          className={`shrink-0 flex items-center justify-center w-12 h-12 rounded-full transition-colors ${
            micStatus === "recording"
              ? "bg-ink text-white animate-pulse"
              : "bg-pebble text-ink-muted hover:bg-pebble/70"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </button>

        {/* Status + transcript */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-ink-muted mb-0.5">
            {micStatus === "recording"
              ? "正在听..."
              : micStatus === "idle"
                ? "点击麦克风开始"
                : "处理中..."}
          </p>
          <p className="text-[12.5px] text-ink-soft truncate">
            {transcript || "说出你的食材，如「鸡蛋三个、牛奶一盒」"}
          </p>
        </div>

        {/* Pending indicator */}
        {pendingCount > 0 && (
          <span className="shrink-0 text-[11px] text-ink-muted bg-pebble/50 rounded-full px-2 py-0.5">
            {pendingCount}
          </span>
        )}
      </div>

      {/* Confirm list */}
      <div className="flex-1 overflow-y-auto">
        <IngredientConfirmList
          items={items}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          onToggle={handleToggle}
          onSave={handleSave}
          saving={saving}
          savedCount={savedCount}
          loading={pendingCount > 0}
        />
      </div>

      {/* Empty state */}
      {items.length === 0 && savedCount === 0 && !error && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <p className="text-4xl mb-3">🎤</p>
          <p className="text-[12px] text-ink-soft mb-1">
            {micStatus === "recording" ? "正在录音，说出你的食材..." : "点击麦克风开始语音添加"}
          </p>
          <p className="text-[11px] text-ink-muted">
            例如："鸡蛋三个、牛奶一盒、西兰花两颗"
          </p>
        </div>
      )}
    </div>
  );
}

// ── Apply AI actions to item list ──

function applyActions(items: ConfirmItem[], actions: VoiceAction[]): ConfirmItem[] {
  let result = [...items];

  for (const action of actions) {
    switch (action.type) {
      case "add":
        result.push({
          id: crypto.randomUUID(),
          name: action.name,
          quantity: action.quantity,
          unit: action.unit,
          category: action.category ?? "other",
          expiry_date: action.expiry_date,
          checked: true,
        });
        break;

      case "update": {
        const target = action.matchName ?? action.name;
        const idx = result.findIndex(
          (i) => i.name === target || i.name.includes(target) || target.includes(i.name),
        );
        if (idx >= 0) {
          result[idx] = {
            ...result[idx],
            ...(action.quantity != null && { quantity: action.quantity }),
            ...(action.unit != null && { unit: action.unit }),
            ...(action.expiry_date != null && { expiry_date: action.expiry_date }),
            ...(action.name !== target && { name: action.name }),
          };
        }
        break;
      }

      case "remove": {
        const target = action.matchName ?? action.name;
        result = result.filter(
          (i) => i.name !== target && !i.name.includes(target) && !target.includes(i.name),
        );
        break;
      }
    }
  }

  return result;
}
