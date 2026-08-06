"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  normalizeImportedRecipe,
  type ImportedRecipe,
  type Recipe,
} from "@/lib/ai-service/types";

const inputClass =
  "w-full rounded-xl border border-pebble bg-pebble/30 px-3 py-2.5 md:py-2 text-base md:text-sm text-ink placeholder-ink-muted focus:border-ink/30 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-ink/20 transition-colors";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB — Vercel function payload limit is 4.5 MB

type Stage = "input" | "extracting" | "preview";
type Mode = "image" | "text" | "link";

const LINK_PATTERN = /https?:\/\/[^\s，。！,!]+/;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function RecipeImportSheet({ open, onClose }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("input");
  const [mode, setMode] = useState<Mode>("image");

  // input state
  const [imageBase64, setImageBase64] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageMime, setImageMime] = useState("image/jpeg");
  const [imageSize, setImageSize] = useState(0);
  const [pastedText, setPastedText] = useState("");
  const [linkText, setLinkText] = useState("");
  const [extractingHint, setExtractingHint] = useState("");
  const [inputError, setInputError] = useState("");

  // preview state (editable Recipe)
  const [draft, setDraft] = useState<Recipe | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prevent body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Reset everything when sheet closes
  useEffect(() => {
    if (open) return;
    setStage("input");
    setMode("image");
    setImageBase64("");
    setImagePreview("");
    setImageSize(0);
    setPastedText("");
    setLinkText("");
    setExtractingHint("");
    setInputError("");
    setDraft(null);
    setSaving(false);
    setSaveError("");
  }, [open]);

  const handleFilePick = useCallback((file: File | null) => {
    setInputError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setInputError("请选择图片文件");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setInputError(`图片太大（${(file.size / 1024 / 1024).toFixed(1)}MB），请压缩到 4MB 以下`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      // dataUrl format: data:image/jpeg;base64,XXXX
      const commaIdx = dataUrl.indexOf(",");
      if (commaIdx < 0) return;
      setImageBase64(dataUrl.slice(commaIdx + 1));
      setImagePreview(dataUrl);
      setImageMime(file.type);
      setImageSize(file.size);
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (mode === "link") {
        setLinkText(text);
      } else {
        setPastedText(text);
      }
      setInputError("");
    } catch {
      setInputError("读取剪贴板失败，请手动粘贴");
    }
  }, [mode]);

  // 视频链接 → 提交转写任务 → 轮询拿文稿
  const fetchVideoTranscript = useCallback(async (shareText: string) => {
    const submitRes = await fetch("/api/recipes/import-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: shareText }),
    });
    const submitData = await submitRes.json().catch(() => ({}));
    if (!submitRes.ok || !submitData?.taskId) {
      throw new Error(
        typeof submitData?.error === "string" ? submitData.error : "提交视频提取任务失败"
      );
    }

    setExtractingHint("正在提取视频语音，通常需要 1-2 分钟…");
    const deadline = Date.now() + 4 * 60_000;
    while (Date.now() < deadline) {
      await sleep(3000);
      const res = await fetch(
        `/api/recipes/import-video?taskId=${encodeURIComponent(submitData.taskId)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "查询失败，请重试");
      }
      if (data.status === "success") {
        const combined = [data.caption, data.transcript]
          .filter((s: unknown) => typeof s === "string" && s.trim())
          .join("\n\n")
          .slice(0, 8000);
        if (combined.trim().length < 20) {
          throw new Error("视频里没有识别到足够的语音内容");
        }
        return combined;
      }
      if (data.status === "failed") {
        throw new Error(data.error || "视频提取失败");
      }
    }
    throw new Error("提取超时，视频可能过长，请换个视频或稍后重试");
  }, []);

  const handleExtract = useCallback(async () => {
    setInputError("");
    setExtractingHint("");

    if (mode === "link" && !LINK_PATTERN.test(linkText)) {
      setInputError("没有找到链接，请粘贴抖音分享的完整文字或链接");
      return;
    }
    if (mode === "image" && !imageBase64) {
      setInputError("请先选一张图");
      return;
    }
    if (mode === "text" && pastedText.trim().length < 20) {
      setInputError("文字太短，至少 20 字");
      return;
    }

    setStage("extracting");
    try {
      const body =
        mode === "image"
          ? { mode: "image", imageBase64, mimeType: imageMime }
          : {
              mode: "text",
              text:
                mode === "link"
                  ? await fetchVideoTranscript(linkText.trim())
                  : pastedText.trim(),
            };

      setExtractingHint("");
      const res = await fetch("/api/recipes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data?.error === "string" ? data.error : "提取失败，请重试");
      }
      const data: { recipe: ImportedRecipe } = await res.json();
      const normalized = normalizeImportedRecipe(data.recipe ?? {});
      setDraft(normalized);
      setStage("preview");
    } catch (err) {
      setInputError(err instanceof Error ? err.message : "提取失败，请重试");
      setStage("input");
    }
  }, [mode, imageBase64, imageMime, pastedText, linkText, fetchVideoTranscript]);

  const handleSave = useCallback(async () => {
    if (!draft || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/recipes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data?.error === "string" ? data.error : "保存失败，请重试");
      }
      router.refresh();
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }, [draft, saving, router, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* 遮罩：点击关闭 */}
      <div
        className="absolute inset-0 bg-ink/20 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Sheet 面板 */}
      <div className="relative flex flex-col bg-surface rounded-t-3xl shadow-soft-lg max-h-[94vh] overflow-hidden">
        {/* 拖拽把手 */}
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-pebble" />
        </div>

        {/* Header */}
        <div className="shrink-0 bg-surface border-b border-pebble/60">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="rounded-full p-2 -m-2 text-ink-soft hover:bg-surface-dim active:bg-pebble transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
            <span className="text-[13px] font-semibold text-ink">
              {stage === "preview" ? "确认菜谱" : "导入菜谱"}
            </span>
            <div className="w-9" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain touch-scroll">
          {stage === "input" && (
            <InputStage
              mode={mode}
              setMode={setMode}
              imagePreview={imagePreview}
              imageSize={imageSize}
              onPickImage={() => fileInputRef.current?.click()}
              onClearImage={() => {
                setImageBase64("");
                setImagePreview("");
                setImageSize(0);
              }}
              pastedText={pastedText}
              setPastedText={setPastedText}
              linkText={linkText}
              setLinkText={setLinkText}
              onPaste={handlePasteFromClipboard}
              inputError={inputError}
              onExtract={handleExtract}
              extractEnabled={
                mode === "image"
                  ? !!imageBase64
                  : mode === "link"
                  ? LINK_PATTERN.test(linkText)
                  : pastedText.trim().length >= 20
              }
            />
          )}

          {stage === "extracting" && (
            <div className="flex flex-col items-center justify-center py-24 px-4">
              <div className="flex gap-1.5 mb-4">
                <span className="w-2 h-2 rounded-full bg-ink-muted animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-ink-muted animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-ink-muted animate-bounce [animation-delay:300ms]" />
              </div>
              <p className="text-sm text-ink-soft">
                {extractingHint ? "蛋厨正在看视频…" : "蛋厨正在读菜谱…"}
              </p>
              <p className="text-xs text-ink-muted mt-1">
                {extractingHint || "通常需要 5-15 秒"}
              </p>
            </div>
          )}

          {stage === "preview" && draft && (
            <PreviewStage
              draft={draft}
              onChange={setDraft}
              saveError={saveError}
            />
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFilePick(e.target.files?.[0] ?? null)}
        />

        {/* Bottom action bar for preview stage */}
        {stage === "preview" && (
          <div className="shrink-0 border-t border-pebble/60 bg-surface px-4 py-3">
            <div className="flex gap-3 max-w-2xl mx-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 rounded-full bg-pebble/60 py-3 text-[13px] font-medium text-ink hover:bg-pebble active:bg-pebble/80 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-full bg-ink py-3 text-[13px] font-medium text-white hover:bg-ink/90 active:bg-ink/80 disabled:opacity-50 transition-colors"
              >
                {saving ? "保存中…" : "保存到菜谱库"}
              </button>
            </div>
            <div className="h-[env(safe-area-inset-bottom)]" />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Input stage ─────────────────────────────────────────────

function InputStage({
  mode,
  setMode,
  imagePreview,
  imageSize,
  onPickImage,
  onClearImage,
  pastedText,
  setPastedText,
  linkText,
  setLinkText,
  onPaste,
  inputError,
  onExtract,
  extractEnabled,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  imagePreview: string;
  imageSize: number;
  onPickImage: () => void;
  onClearImage: () => void;
  pastedText: string;
  setPastedText: (t: string) => void;
  linkText: string;
  setLinkText: (t: string) => void;
  onPaste: () => void;
  inputError: string;
  onExtract: () => void;
  extractEnabled: boolean;
}) {
  return (
    <div className="px-5 py-5 max-w-2xl mx-auto space-y-5">
      <p className="text-xs text-ink-muted">
        从抖音、小红书、微信等地方看到的菜谱都可以导入。AI 会自动识别结构，你确认后入库。
      </p>

      {/* Tabs（segmented control，chips 语法） */}
      <div className="flex gap-2 p-1 rounded-2xl bg-surface-dim">
        <button
          type="button"
          onClick={() => setMode("image")}
          className={`flex-1 rounded-xl py-2 text-[12.5px] font-medium transition-colors ${
            mode === "image" ? "bg-ink text-white shadow-sm" : "text-ink-muted hover:text-ink-soft"
          }`}
        >
          📷 截图
        </button>
        <button
          type="button"
          onClick={() => setMode("text")}
          className={`flex-1 rounded-xl py-2 text-[12.5px] font-medium transition-colors ${
            mode === "text" ? "bg-ink text-white shadow-sm" : "text-ink-muted hover:text-ink-soft"
          }`}
        >
          📝 粘贴文字
        </button>
        <button
          type="button"
          onClick={() => setMode("link")}
          className={`flex-1 rounded-xl py-2 text-[12.5px] font-medium transition-colors ${
            mode === "link" ? "bg-ink text-white shadow-sm" : "text-ink-muted hover:text-ink-soft"
          }`}
        >
          🔗 视频链接
        </button>
      </div>

      {mode === "image" && (
        <div className="space-y-3">
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden border border-pebble/60">
              <img src={imagePreview} alt="preview" className="w-full max-h-96 object-contain bg-surface-dim" />
              <button
                type="button"
                onClick={onClearImage}
                className="absolute top-2 right-2 rounded-full bg-ink/60 backdrop-blur-sm p-1.5 text-white hover:bg-ink/70 transition-colors"
                aria-label="移除图片"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
              <p className="absolute bottom-2 left-2 rounded-md bg-ink/60 backdrop-blur-sm px-2 py-0.5 text-xs text-white">
                {(imageSize / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={onPickImage}
              className="w-full rounded-xl border-2 border-dashed border-pebble bg-pebble/20 hover:bg-pebble/30 hover:border-ink/30 transition-colors py-12 flex flex-col items-center gap-2"
            >
              <span className="text-3xl">🖼️</span>
              <span className="text-sm font-medium text-ink-soft">点击选择图片</span>
              <span className="text-xs text-ink-muted">最大 4 MB，支持 JPG / PNG / WebP</span>
            </button>
          )}
        </div>
      )}

      {mode === "text" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-ink-soft">粘贴菜谱文字</label>
            <button
              type="button"
              onClick={onPaste}
              className="text-xs text-ink-muted hover:text-ink underline underline-offset-2"
            >
              从剪贴板粘贴
            </button>
          </div>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="例如：今日份晚餐🍽️ 番茄炒蛋&#10;食材：番茄 2 个、鸡蛋 3 个、葱花少许&#10;做法：1. 番茄切块…"
            rows={10}
            className={`${inputClass} resize-none`}
          />
          <p className="text-xs text-ink-muted text-right">
            {pastedText.length} 字（至少 20 字）
          </p>
        </div>
      )}

      {mode === "link" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-ink-soft">抖音视频链接</label>
            <button
              type="button"
              onClick={onPaste}
              className="text-xs text-ink-muted hover:text-ink underline underline-offset-2"
            >
              从剪贴板粘贴
            </button>
          </div>
          <textarea
            value={linkText}
            onChange={(e) => setLinkText(e.target.value)}
            placeholder="在抖音里点「分享 → 复制链接」，把整段文字粘到这里即可&#10;例如：7.99 abc:/ 复制打开抖音… https://v.douyin.com/xxxx/"
            rows={4}
            className={`${inputClass} resize-none`}
          />
          <p className="text-xs text-ink-muted">
            蛋厨会听完视频里的讲解，自动整理成菜谱。视频越短越快，通常 1-2 分钟。
          </p>
        </div>
      )}

      {inputError && (
        <p className="text-xs text-danger text-center">{inputError}</p>
      )}

      <button
        type="button"
        onClick={onExtract}
        disabled={!extractEnabled}
        className="w-full rounded-full bg-ink py-3 text-[13px] font-medium text-white hover:bg-ink/90 active:bg-ink/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        开始提取
      </button>
    </div>
  );
}

// ── Preview stage ───────────────────────────────────────────

const DIFFICULTY_OPTIONS: Array<{ value: Recipe["difficulty"]; label: string }> = [
  { value: "easy", label: "简单" },
  { value: "medium", label: "中等" },
  { value: "hard", label: "困难" },
];

function PreviewStage({
  draft,
  onChange,
  saveError,
}: {
  draft: Recipe;
  onChange: (next: Recipe) => void;
  saveError: string;
}) {
  const update = useCallback(
    <K extends keyof Recipe>(key: K, value: Recipe[K]) => {
      onChange({ ...draft, [key]: value });
    },
    [draft, onChange]
  );

  const updateIngredient = (idx: number, patch: Partial<Recipe["ingredients"][number]>) => {
    const next = draft.ingredients.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange({ ...draft, ingredients: next });
  };

  const addIngredient = () => {
    onChange({
      ...draft,
      ingredients: [...draft.ingredients, { name: "", amount: "", unit: "" }],
    });
  };

  const removeIngredient = (idx: number) => {
    onChange({ ...draft, ingredients: draft.ingredients.filter((_, i) => i !== idx) });
  };

  const updateStep = (idx: number, patch: Partial<Recipe["steps"][number]>) => {
    const next = draft.steps.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange({ ...draft, steps: next });
  };

  const addStep = () => {
    onChange({
      ...draft,
      steps: [
        ...draft.steps,
        { order: draft.steps.length + 1, instruction: "" },
      ],
    });
  };

  const removeStep = (idx: number) => {
    const filtered = draft.steps.filter((_, i) => i !== idx);
    onChange({
      ...draft,
      steps: filtered.map((s, i) => ({ ...s, order: i + 1 })),
    });
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= draft.steps.length) return;
    const next = draft.steps.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ ...draft, steps: next.map((s, i) => ({ ...s, order: i + 1 })) });
  };

  return (
    <div className="px-5 py-5 max-w-2xl mx-auto space-y-5 pb-24">
      <p className="text-xs text-warn bg-butter/60 rounded-lg px-3 py-2">
        ⚠️ AI 识别可能不全，请检查关键字段（标题、食材、步骤）。留空的会用默认值补。
      </p>

      {/* Title & description */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-ink-muted mb-1">菜名</label>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="未提取到，建议手动填入"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-ink-muted mb-1">简介（可选）</label>
          <textarea
            value={draft.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="一句话描述这道菜"
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>

      {/* Meta row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-ink-muted mb-1">菜系</label>
          <input
            type="text"
            value={draft.cuisine}
            onChange={(e) => update("cuisine", e.target.value)}
            placeholder="如 中式 / 意式"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-ink-muted mb-1">人份</label>
          <input
            type="number"
            min={1}
            value={draft.servings}
            onChange={(e) => update("servings", Math.max(1, Number(e.target.value) || 1))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-ink-muted mb-1">准备时间（分钟）</label>
          <input
            type="number"
            min={0}
            value={draft.prepTimeMinutes}
            onChange={(e) => update("prepTimeMinutes", Math.max(0, Number(e.target.value) || 0))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-ink-muted mb-1">烹饪时间（分钟）</label>
          <input
            type="number"
            min={0}
            value={draft.cookTimeMinutes}
            onChange={(e) => update("cookTimeMinutes", Math.max(0, Number(e.target.value) || 0))}
            className={inputClass}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-ink-muted mb-1">难度</label>
          <div className="flex gap-2">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update("difficulty", opt.value)}
                className={`flex-1 rounded-full border py-2 text-sm transition-colors ${
                  draft.difficulty === opt.value
                    ? "border-ink bg-ink text-white"
                    : "border-pebble/60 bg-white/70 text-ink-muted hover:border-ink/30"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ingredients */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-semibold text-ink">食材</h3>
          <span className="text-xs text-ink-muted">{draft.ingredients.length} 项</span>
        </div>
        <div className="space-y-2">
          {draft.ingredients.map((ing, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <input
                type="text"
                value={ing.name}
                onChange={(e) => updateIngredient(idx, { name: e.target.value })}
                placeholder="食材名"
                className={`${inputClass} flex-1`}
              />
              <input
                type="text"
                value={ing.amount}
                onChange={(e) => updateIngredient(idx, { amount: e.target.value })}
                placeholder="量"
                className={`${inputClass} w-16`}
              />
              <input
                type="text"
                value={ing.unit}
                onChange={(e) => updateIngredient(idx, { unit: e.target.value })}
                placeholder="单位"
                className={`${inputClass} w-16`}
              />
              <button
                type="button"
                onClick={() => removeIngredient(idx)}
                aria-label="删除"
                className="shrink-0 rounded-lg p-2 text-ink-muted hover:text-danger hover:bg-danger/10 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M3 6h18" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addIngredient}
          className="mt-2 w-full rounded-lg border border-dashed border-pebble py-2 text-xs text-ink-muted hover:bg-surface-dim transition-colors"
        >
          + 添加食材
        </button>
      </div>

      {/* Steps */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-semibold text-ink">步骤</h3>
          <span className="text-xs text-ink-muted">{draft.steps.length} 步</span>
        </div>
        <div className="space-y-3">
          {draft.steps.map((step, idx) => (
            <div key={idx} className="rounded-xl border border-pebble/60 p-3 space-y-2 bg-surface">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink">第 {step.order} 步</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveStep(idx, -1)}
                    disabled={idx === 0}
                    aria-label="上移"
                    className="rounded p-1 text-ink-muted hover:text-ink hover:bg-surface-dim disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(idx, 1)}
                    disabled={idx === draft.steps.length - 1}
                    aria-label="下移"
                    className="rounded p-1 text-ink-muted hover:text-ink hover:bg-surface-dim disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    aria-label="删除"
                    className="rounded p-1 text-ink-muted hover:text-danger hover:bg-danger/10"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <path d="M3 6h18" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
              <textarea
                value={step.instruction}
                onChange={(e) => updateStep(idx, { instruction: e.target.value })}
                placeholder="步骤描述"
                rows={2}
                className={`${inputClass} resize-none`}
              />
              <input
                type="text"
                value={step.tip ?? ""}
                onChange={(e) => updateStep(idx, { tip: e.target.value })}
                placeholder="💡 小贴士（可选）"
                className={inputClass}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addStep}
          className="mt-2 w-full rounded-lg border border-dashed border-pebble py-2 text-xs text-ink-muted hover:bg-surface-dim transition-colors"
        >
          + 添加步骤
        </button>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-xs text-ink-muted mb-1">标签（逗号分隔）</label>
        <input
          type="text"
          value={draft.tags.join(", ")}
          onChange={(e) =>
            update(
              "tags",
              e.target.value
                .split(/[,，]/)
                .map((t) => t.trim())
                .filter(Boolean)
            )
          }
          placeholder="如 下饭, 快手, 辣"
          className={inputClass}
        />
      </div>

      {saveError && (
        <p className="text-xs text-danger text-center">{saveError}</p>
      )}
    </div>
  );
}
