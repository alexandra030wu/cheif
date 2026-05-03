"use client";

import { memo, useRef, useEffect } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
}

export const ChatInput = memo(function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const compositionEndAtRef = useRef(0);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
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
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-2xl flex items-end gap-2 px-3 py-2.5">
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionEnd={handleCompositionEnd}
          placeholder="想吃什么？告诉我..."
          disabled={disabled}
          className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-300 focus:bg-white focus:outline-none disabled:opacity-50 transition-colors"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!value.trim() || disabled}
          className="shrink-0 rounded-xl bg-gray-900 p-2.5 text-white disabled:opacity-30 hover:bg-gray-700 active:bg-gray-800 transition-colors"
          aria-label="发送"
        >
          {disabled ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
            </svg>
          )}
        </button>
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
});
