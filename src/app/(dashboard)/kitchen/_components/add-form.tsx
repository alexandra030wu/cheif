"use client";

import { useActionState } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { addIngredient, type AddIngredientState } from "../actions";
import { CATEGORIES } from "./constants";

const inputClass =
  "w-full rounded-xl border border-pebble bg-pebble/30 px-3 py-2.5 md:py-2 text-base md:text-sm text-ink placeholder-ink-muted focus:border-ink/30 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-ink/20 transition-colors";

const labelClass = "block text-[11px] font-medium text-ink-soft mb-1";

const initialState: AddIngredientState = { status: "idle" };

interface Props {
  onBack?: () => void;
}

export function AddIngredientForm({ onBack }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(addIngredient, initialState);
  const [savedCount, setSavedCount] = useState(0);

  // On success: reset form, increment counter (don't redirect)
  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setSavedCount((c) => c + 1);
    }
  }, [state]);

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;
  const message = state.status === "error" ? state.message : undefined;

  return (
    <form ref={formRef} action={action} className="space-y-5">
      {message && (
        <p className="text-[11px] text-danger bg-danger/10 px-3 py-2 rounded-lg">
          {message}
        </p>
      )}

      {/* 名称 */}
      <div>
        <label className={labelClass} htmlFor="name">食材名称 *</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="例如：鸡胸肉"
          className={inputClass}
        />
        {fieldErrors?.name && (
          <p className="mt-1 text-[11px] text-danger">{fieldErrors.name[0]}</p>
        )}
      </div>

      {/* 分类 */}
      <div>
        <label className={labelClass} htmlFor="category">分类 *</label>
        <select id="category" name="category" required className={inputClass}>
          <option value="">请选择分类</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        {fieldErrors?.category && (
          <p className="mt-1 text-[11px] text-danger">{fieldErrors.category[0]}</p>
        )}
      </div>

      {/* 数量 + 单位 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="quantity">数量</label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min="0"
            step="any"
            placeholder="例如：500"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="unit">单位</label>
          <input
            id="unit"
            name="unit"
            type="text"
            placeholder="克、个、袋…"
            className={inputClass}
          />
        </div>
      </div>

      {/* 保质期 */}
      <div>
        <label className={labelClass} htmlFor="expiry_date">保质期至</label>
        <input
          id="expiry_date"
          name="expiry_date"
          type="date"
          className={inputClass}
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-full bg-ink px-4 py-3 md:py-2 text-[13px] font-medium text-white hover:bg-ink/90 active:bg-ink/80 disabled:opacity-50 transition-colors"
        >
          {pending ? "保存中…" : "保存食材"}
        </button>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-pebble/60 bg-white/70 px-4 py-3 md:py-2 text-[13px] text-ink-soft hover:border-ink/30 hover:bg-surface-dim active:bg-pebble/60 transition-colors"
          >
            返回选择
          </button>
        )}
      </div>

      {/* Saved counter */}
      {savedCount > 0 && (
        <p className="text-center text-[11px] text-ink-muted pt-1">
          已添加 {savedCount} 个 ·{" "}
          <Link href="/kitchen" className="text-ink underline underline-offset-2">
            查看食材库
          </Link>
        </p>
      )}
    </form>
  );
}
