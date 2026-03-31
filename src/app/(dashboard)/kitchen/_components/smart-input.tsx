"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { bulkAddIngredients } from "../actions";

const CATEGORIES = [
  { value: "vegetable", label: "蔬菜" },
  { value: "fruit", label: "水果" },
  { value: "protein", label: "蛋白质（肉/蛋/豆）" },
  { value: "dairy", label: "乳制品" },
  { value: "grain", label: "谷物/主食" },
  { value: "spice", label: "香料" },
  { value: "condiment", label: "调味品" },
  { value: "other", label: "其他" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

interface ParsedItem {
  name: string;
  quantity?: number;
  unit?: string;
  category: Category;
}

type Status = "idle" | "listening" | "parsing" | "parsed" | "saving";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 md:px-2 md:py-1.5 text-base md:text-sm text-gray-900 focus:border-gray-400 focus:outline-none transition-colors";

export function SmartInput() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const processedIndexRef = useRef(0);

  // ── Cleanup: stop recognition when unmounted ─────────────────
  useEffect(() => {
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      recognitionRef.current?.stop();
    };
  }, []);

  // ── Voice input ───────────────────────────────────────────────
  function toggleListening() {
    if (status === "listening") {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      recognitionRef.current?.stop();
      setStatus("idle");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const SpeechRecognitionCtor = w.SpeechRecognition ?? w.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setError("当前浏览器不支持语音输入");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const recognition = new SpeechRecognitionCtor();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    recognition.lang = "zh-CN";
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    recognition.continuous = true;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    recognition.interimResults = false;
    recognitionRef.current = recognition;
    processedIndexRef.current = 0;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    recognition.onresult = (e: {
      resultIndex: number;
      results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
    }) => {
      // Only process new final results to avoid duplication.
      // e.results accumulates all results since start — we track the last
      // processed index so each final transcript is appended exactly once.
      let newText = "";
      for (let i = processedIndexRef.current; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          newText += (result[0] as { transcript: string }).transcript;
          processedIndexRef.current = i + 1;
        }
      }
      if (newText) {
        setText((prev) => (prev ? prev + "，" + newText : newText));
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    recognition.onerror = () => {
      setStatus("idle");
      setError("语音识别出错，请重试");
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    recognition.onend = () => {
      setStatus((s) => (s === "listening" ? "idle" : s));
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    recognition.start();
    setStatus("listening");
    setError(null);
  }

  // ── Parse ─────────────────────────────────────────────────────
  async function handleParse() {
    if (!text.trim()) return;
    setStatus("parsing");
    setError(null);

    try {
      const res = await fetch("/api/ingredients/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { items: ParsedItem[] };
      setItems(data.items ?? []);
      setStatus("parsed");
    } catch {
      setError("解析失败，请重试");
      setStatus("idle");
    }
  }

  // ── Inline edit helpers ────────────────────────────────────────
  function updateItem<K extends keyof ParsedItem>(
    index: number,
    key: K,
    value: ParsedItem[K]
  ) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Bulk save ─────────────────────────────────────────────────
  async function handleSave() {
    if (items.length === 0) return;
    setStatus("saving");
    setError(null);

    const result = await bulkAddIngredients(items);

    if (result.status === "error") {
      setError(result.message);
      setStatus("parsed");
      return;
    }

    router.push("/kitchen");
  }

  const isBusy = status === "parsing" || status === "saving";
  const isParsed = status === "parsed";

  return (
    <div className="space-y-5">
      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {/* Text input + mic */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          描述你的食材
        </label>
        <div className="relative">
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="例如：鸡胸肉500克、西红柿3个、盐一袋…"
            disabled={isBusy}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none resize-none transition-colors disabled:opacity-50"
          />
          <button
            type="button"
            onClick={toggleListening}
            disabled={isBusy}
            title={status === "listening" ? "停止录音" : "语音输入"}
            className={`absolute right-2 top-2 rounded-lg p-1.5 transition-colors disabled:opacity-40 ${
              status === "listening"
                ? "bg-red-100 text-red-600 animate-pulse"
                : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
              <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.08A7 7 0 0 0 19 11Z" />
            </svg>
          </button>
        </div>
        {status === "listening" && (
          <p className="mt-1 text-xs text-red-500">正在录音，再次点击麦克风停止…</p>
        )}
      </div>

      {/* Parse button (only shown before results) */}
      {!isParsed && (
        <button
          type="button"
          onClick={handleParse}
          disabled={!text.trim() || isBusy}
          className="w-full rounded-lg bg-gray-900 px-4 py-3 md:py-2 text-sm font-medium text-white hover:bg-gray-700 active:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {status === "parsing" ? "解析中…" : "✨ 智能解析"}
        </button>
      )}

      {/* Parsed results table */}
      {isParsed && items.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              解析结果（共 {items.length} 项，可直接编辑）
            </p>
            <button
              type="button"
              onClick={() => {
                setStatus("idle");
                setItems([]);
              }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              重新输入
            </button>
          </div>

          {/* Mobile: card layout */}
          <div className="space-y-3 md:hidden">
            {items.map((item, i) => (
              <div key={i} className="rounded-lg border border-gray-100 bg-white p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <input
                    value={item.name}
                    onChange={(e) => updateItem(i, "name", e.target.value)}
                    placeholder="名称"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="shrink-0 ml-2 p-2 text-gray-300 hover:text-red-400 active:text-red-500 transition-colors"
                    title="删除"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">数量</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.quantity ?? ""}
                      onChange={(e) =>
                        updateItem(i, "quantity", e.target.value ? Number(e.target.value) : undefined)
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">单位</label>
                    <input
                      value={item.unit ?? ""}
                      onChange={(e) => updateItem(i, "unit", e.target.value || undefined)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">分类</label>
                    <select
                      value={item.category}
                      onChange={(e) => updateItem(i, "category", e.target.value as Category)}
                      className={inputClass}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table layout */}
          <div className="hidden md:block rounded-lg border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-3 py-2 text-left font-medium text-gray-500 text-xs">名称</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 text-xs">数量</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 text-xs">单位</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 text-xs">分类</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, i) => (
                  <tr key={i} className="bg-white hover:bg-gray-50/50">
                    <td className="px-2 py-1.5">
                      <input
                        value={item.name}
                        onChange={(e) => updateItem(i, "name", e.target.value)}
                        className={inputClass}
                      />
                    </td>
                    <td className="px-2 py-1.5 w-20">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.quantity ?? ""}
                        onChange={(e) =>
                          updateItem(
                            i,
                            "quantity",
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                        className={inputClass}
                      />
                    </td>
                    <td className="px-2 py-1.5 w-20">
                      <input
                        value={item.unit ?? ""}
                        onChange={(e) =>
                          updateItem(i, "unit", e.target.value || undefined)
                        }
                        className={inputClass}
                      />
                    </td>
                    <td className="px-2 py-1.5 w-28">
                      <select
                        value={item.category}
                        onChange={(e) =>
                          updateItem(i, "category", e.target.value as Category)
                        }
                        className={inputClass}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                        title="删除"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={items.length === 0}
            className="w-full rounded-lg bg-gray-900 px-4 py-3 md:py-2 text-sm font-medium text-white hover:bg-gray-700 active:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            保存全部 {items.length} 项食材
          </button>
        </div>
      )}

      {isParsed && items.length === 0 && (
        <div className="text-center text-sm text-gray-400 py-4">
          没有识别到食材，请
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="underline ml-1"
          >
            重新输入
          </button>
        </div>
      )}
    </div>
  );
}
