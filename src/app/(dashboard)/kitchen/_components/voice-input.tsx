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
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← 返回选择
        </button>
        <h2 className="text-base font-semibold text-gray-900">语音添加</h2>
        <div className="w-16" />
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-3">{error}</p>
      )}

      {/* Mic status area */}
      <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 mb-4">
        {/* Mic button */}
        <button
          type="button"
          onClick={toggleMic}
          className={`shrink-0 flex items-center justify-center w-12 h-12 rounded-full transition-colors ${
            micStatus === "recording"
              ? "bg-red-100 text-red-600 animate-pulse"
              : "bg-gray-200 text-gray-500 hover:bg-gray-300"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
            <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.08A7 7 0 0 0 19 11Z" />
          </svg>
        </button>

        {/* Status + transcript */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 mb-0.5">
            {micStatus === "recording"
              ? "正在听..."
              : micStatus === "idle"
                ? "点击麦克风开始"
                : "处理中..."}
          </p>
          <p className="text-sm text-gray-700 truncate">
            {transcript || "说出你的食材，如「鸡蛋三个、牛奶一盒」"}
          </p>
        </div>

        {/* Pending indicator */}
        {pendingCount > 0 && (
          <span className="shrink-0 text-xs text-blue-500 bg-blue-50 rounded-full px-2 py-0.5">
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
          <p className="text-sm text-gray-500 mb-1">
            {micStatus === "recording" ? "正在录音，说出你的食材..." : "点击麦克风开始语音添加"}
          </p>
          <p className="text-xs text-gray-400">
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
