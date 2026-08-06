"use client";

import { useCallback, useEffect, useState } from "react";
import { updateIngredient, deleteIngredient } from "../actions";
import { CATEGORIES, CATEGORY_EMOJI, CATEGORY_LABELS } from "./constants";

const inputClass =
  "w-full rounded-xl border border-pebble bg-pebble/30 px-3 py-2.5 md:py-2 text-base md:text-sm text-ink placeholder-ink-muted focus:border-ink/30 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-ink/20 transition-colors";

export interface EditableIngredient {
  id: string;
  name: string;
  category: string;
  quantity: number | null;
  unit: string | null;
  expiry_date: string | null;
  icon_url: string | null;
}

interface Props {
  ingredient: EditableIngredient | null;
  onClose: () => void;
}

function getExpiryInfo(expiry_date: string | null) {
  if (!expiry_date) {
    return { label: "未设置保质期", color: "text-ink-muted bg-surface-dim", days: null };
  }
  const now = Date.now();
  const expiry = new Date(expiry_date).getTime();
  const daysLeft = Math.floor((expiry - now) / 86400000);

  if (daysLeft < 0) {
    return {
      label: `已过期 ${Math.abs(daysLeft)} 天`,
      color: "text-danger bg-danger/10",
      days: daysLeft,
    };
  }
  if (daysLeft <= 3) {
    return {
      label: `还剩 ${daysLeft} 天`,
      color: "text-warn bg-warn/10",
      days: daysLeft,
    };
  }
  if (daysLeft <= 7) {
    return {
      label: `还剩 ${daysLeft} 天`,
      color: "text-warn bg-butter/60",
      days: daysLeft,
    };
  }
  return {
    label: `还剩 ${daysLeft} 天`,
    color: "text-ok bg-ok/10",
    days: daysLeft,
  };
}

export function EditIngredientSheet({ ingredient, onClose }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("other");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  // Sync form when ingredient changes
  useEffect(() => {
    if (ingredient) {
      setName(ingredient.name);
      setCategory(ingredient.category);
      setQuantity(ingredient.quantity != null ? String(ingredient.quantity) : "");
      setUnit(ingredient.unit ?? "");
      setExpiryDate(ingredient.expiry_date ?? "");
      setError("");
      setEditing(false);
      setConfirmDelete(false);
    }
  }, [ingredient]);

  // Lock body scroll
  useEffect(() => {
    if (ingredient) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [ingredient]);

  const handleSave = useCallback(async () => {
    if (!ingredient || saving) return;
    setSaving(true);
    setError("");

    const result = await updateIngredient(ingredient.id, {
      name: name.trim(),
      category,
      quantity: quantity ? Number(quantity) : undefined,
      unit: unit || undefined,
      expiry_date: expiryDate || undefined,
    });

    setSaving(false);

    if (result.status === "error") {
      const msg =
        result.message ??
        (result.fieldErrors
          ? Object.values(result.fieldErrors).flat().join("、")
          : "保存失败");
      setError(msg);
      return;
    }

    setEditing(false);
  }, [ingredient, saving, name, category, quantity, unit, expiryDate]);

  const handleDelete = useCallback(async () => {
    if (!ingredient || deleting) return;
    setDeleting(true);
    await deleteIngredient(ingredient.id);
    setDeleting(false);
    onClose();
  }, [ingredient, deleting, onClose]);

  if (!ingredient) return null;

  const expiry = getExpiryInfo(ingredient.expiry_date);
  const categoryLabel = CATEGORY_LABELS[ingredient.category] ?? ingredient.category;
  const emoji = CATEGORY_EMOJI[ingredient.category] ?? "📦";

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/20 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-surface rounded-t-3xl shadow-soft-lg max-h-[90vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-pebble" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink-soft hover:bg-surface-dim active:bg-pebble transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <span className="text-[13px] font-semibold text-ink">食材详情</span>
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-full px-3 py-1.5 text-[11px] font-medium text-ink-soft hover:bg-surface-dim transition-colors"
            >
              编辑
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full px-3 py-1.5 text-[11px] font-medium text-ink-muted hover:bg-surface-dim transition-colors"
            >
              取消
            </button>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto overscroll-contain touch-scroll px-5 pb-4">
          {/* Hero image */}
          <div className="flex justify-center py-4">
            <div className="w-40 h-40 rounded-2xl bg-surface-dim flex items-center justify-center overflow-hidden shadow-sm">
              {ingredient.icon_url ? (
                <img
                  src={ingredient.icon_url}
                  alt={ingredient.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-7xl">{emoji}</span>
              )}
            </div>
          </div>

          {/* Name + meta summary */}
          {!editing && (
            <div className="text-center mb-5">
              <h2 className="text-[22px] font-bold text-ink mb-1">
                {ingredient.name}
              </h2>
              <div className="flex items-center justify-center gap-2 text-[11px] text-ink-muted">
                <span>{categoryLabel}</span>
                {ingredient.quantity != null && (
                  <>
                    <span className="text-pebble">·</span>
                    <span>
                      {ingredient.quantity}
                      {ingredient.unit ?? ""}
                    </span>
                  </>
                )}
                <span className="text-pebble">·</span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-medium ${expiry.color}`}
                >
                  {expiry.label}
                </span>
              </div>
            </div>
          )}

          {/* Divider */}
          {!editing && <div className="border-t border-pebble/60 mb-4" />}

          {/* Detail fields (read-only) */}
          {!editing && (
            <div className="space-y-3">
              <DetailRow label="数量" value={ingredient.quantity != null ? `${ingredient.quantity} ${ingredient.unit ?? ""}` : "未设置"} />
              <DetailRow label="分类" value={categoryLabel} />
              <DetailRow
                label="保质期"
                value={ingredient.expiry_date ?? "未设置"}
                valueClass={expiry.days !== null && expiry.days < 0 ? "text-danger font-medium" : undefined}
              />
            </div>
          )}

          {/* Edit form */}
          {editing && (
            <div className="space-y-4 mt-2">
              {error && (
                <p className="text-[11px] text-danger bg-danger/10 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <div>
                <label className="block text-[11px] font-medium text-ink-soft mb-1">
                  食材名称
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ink-soft mb-1">
                  分类
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputClass}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-ink-soft mb-1">
                    数量
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="例如：500"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink-soft mb-1">
                    单位
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="克、个、袋…"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ink-soft mb-1">
                  保质期至
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="px-5 py-4 border-t border-pebble/60 space-y-3">
          {editing ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="w-full rounded-full bg-ink py-3 text-[13px] font-medium text-white hover:bg-ink/90 active:bg-ink/80 disabled:opacity-50 transition-colors"
            >
              {saving ? "保存中..." : "保存修改"}
            </button>
          ) : confirmDelete ? (
            <div className="space-y-2">
              <p className="text-[12px] text-center text-ink-soft">
                确定要删除「{ingredient.name}」吗？此操作不可撤销。
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-full border border-pebble/60 bg-white/70 py-3 text-[13px] font-medium text-ink-soft hover:bg-surface-dim transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-full bg-danger/10 py-3 text-[13px] font-medium text-danger hover:bg-danger/15 active:bg-danger/20 disabled:opacity-50 transition-colors"
                >
                  {deleting ? "删除中..." : "确认删除"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full rounded-full border border-danger/30 bg-danger/5 py-3 text-[13px] font-medium text-danger hover:bg-danger/10 active:bg-danger/15 transition-colors"
            >
              删除这个食材
            </button>
          )}
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    </div>
  );
}

// ── Helper component ──

function DetailRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[11px] text-ink-muted">{label}</span>
      <span className={`text-[12px] ${valueClass ?? "text-ink"}`}>
        {value}
      </span>
    </div>
  );
}
