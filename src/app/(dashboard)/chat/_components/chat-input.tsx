"use client";

import { memo, useRef, useEffect } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  /** 框内底栏左侧的附件位(用量徽章等) */
  accessory?: React.ReactNode;
}

export const ChatInput = memo(function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  accessory,
}: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const compositionEndAtRef = useRef(0);

  // 焦点管理(2026-08-03 交互迭代):桌面(pointer:fine)挂载即聚焦;
  // 发送完成(disabled true→false)后回焦 — 连续对话不用摸鼠标。
  // 移动端不做 autofocus,避免一进页就弹键盘。
  const isDesktop = () =>
    typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
  useEffect(() => {
    if (isDesktop()) inputRef.current?.focus();
  }, []);
  const prevDisabled = useRef(disabled);
  useEffect(() => {
    if (prevDisabled.current && !disabled && isDesktop()) {
      inputRef.current?.focus();
    }
    prevDisabled.current = disabled;
  }, [disabled]);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  }, [value]);

  function handleCompositionEnd() {
    compositionEndAtRef.current = performance.now();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Enter" || e.shiftKey) return;
    if (e.nativeEvent.isComposing) return;
    // Some IMEs (notably macOS 拼音) fire compositionend immediately before
    // keydown(Enter) — at that point isComposing is already false, but the
    // Enter is part of the IME's "commit + newline" gesture, not a send
    // intent. Swallow Enter for 50ms after compositionend.
    if (performance.now() - compositionEndAtRef.current < 50) return;
    e.preventDefault();
    if (value.trim() && !disabled) onSend();
  }

  return (
    // Claude / Codex 客户端式:浮在画布上的大圆角输入卡,上面是多行输入区,
    // 下面一条底栏(左附件位、右圆形发送钮)。
    // 过渡分两层:上缘毛玻璃渐变(规格与顶栏一致)遮住滑过的历史消息;
    // 输入框下沿到窗口底边为纯实色,不透任何文字。
    <div className="fixed bottom-0 left-0 md:left-52 right-0 z-30 pointer-events-none">
      {/* 过渡层收窄到输入列同宽(max-w-3xl),不横穿全窗 —
          免得盖住窗口右缘的滚动条;消息列同宽,列外本来就没有文字 */}
      <div className="relative mx-auto max-w-3xl">
      <div className="absolute inset-x-0 -top-7 bottom-0 backdrop-blur-md bg-canvas/70 [mask-image:linear-gradient(to_top,black_55%,transparent)]" />
      <div className="absolute inset-x-0 bottom-0 h-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-canvas" />
      <div className="relative px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
      <div className="pointer-events-auto">
        <div
          onClick={() => inputRef.current?.focus()}
          className="cursor-text rounded-3xl bg-surface ring-1 ring-black/[0.06] shadow-soft-lg focus-within:ring-ink/15 transition-shadow"
        >
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionEnd={handleCompositionEnd}
          placeholder="想吃什么？告诉我..."
          disabled={disabled}
          className="block w-full min-h-[52px] resize-none bg-transparent px-4 pt-3.5 pb-1 text-[14px] leading-relaxed text-ink placeholder-ink-muted focus:outline-none disabled:opacity-50"
        />
        <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
          <div className="min-w-0 flex items-center">{accessory}</div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSend();
            }}
            disabled={!value.trim() || disabled}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-ink text-white disabled:bg-ink/15 disabled:text-white hover:bg-ink/90 active:bg-ink/80 transition-colors"
            aria-label="发送"
          >
            {disabled ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="m5 12 7-7 7 7" />
                <path d="M12 19V5" />
              </svg>
            )}
          </button>
        </div>
        </div>
      </div>
      </div>
      </div>
    </div>
  );
});
