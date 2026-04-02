"use client";

import { useCallback, useEffect, useState } from "react";
import { updateIngredient, deleteIngredient } from "../actions";
import { CATEGORIES, CATEGORY_EMOJI, CATEGORY_LABELS } from "./constants";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 md:py-2 text-base md:text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none transition-colors";

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
    return { label: "未设置保质期", color: "text-gray-400 bg-gray-100", days: null };
  }
  const now = Date.now();
  const expiry = new Date(expiry_date).getTime();
  const daysLeft = Math.floor((expiry - now) / 86400000);

  if (daysLeft < 0) {
    return {
      label: `已过期 ${Math.abs(daysLeft)} 天`,
      color: "text-red-700 bg-red-100",
      days: daysLeft,
    };
  }
  if (daysLeft <= 3) {
    return {
      label: `还剩 ${daysLeft} 天`,
      color: "text-amber-700 bg-amber-100",
      days: daysLeft,
    };
  }
  if (daysLeft <= 7) {
    return {
      label: `还剩 ${daysLeft} 天`,
      color: "text-yellow-700 bg-yellow-100",
      days: daysLeft,
    };
  }
  return {
    label: `还剩 ${daysLeft} 天`,
    color: "text-green-700 bg-green-100",
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
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="text-sm font-medium text-gray-900">食材详情</span>
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              编辑
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-100 transition-colors"
            >
              取消
            </button>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-5 pb-4">
          {/* Hero image */}
          <div className="flex justify-center py-4">
            <div className="w-40 h-40 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden shadow-sm">
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
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {ingredient.name}
              </h2>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <span>{categoryLabel}</span>
                {ingredient.quantity != null && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span>
                      {ingredient.quantity}
                      {ingredient.unit ?? ""}
                    </span>
                  </>
                )}
                <span className="text-gray-300">·</span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${expiry.color}`}
                >
                  {expiry.label}
                </span>
              </div>
            </div>
          )}

          {/* Divider */}
          {!editing && <div className="border-t border-gray-100 mb-4" />}

          {/* Detail fields (read-only) */}
          {!editing && (
            <div className="space-y-3">
              <DetailRow label="数量" value={ingredient.quantity != null ? `${ingredient.quantity} ${ingredient.unit ?? ""}` : "未设置"} />
              <DetailRow label="分类" value={categoryLabel} />
              <DetailRow
                label="保质期"
                value={ingredient.expiry_date ?? "未设置"}
                valueClass={expiry.days !== null && expiry.days < 0 ? "text-red-600 font-medium" : undefined}
              />
            </div>
          )}

          {/* Edit form */}
          {editing && (
            <div className="space-y-4 mt-2">
              {error && (
                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
        <div className="px-5 py-4 border-t border-gray-100 space-y-3">
          {editing ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="w-full rounded-xl bg-gray-900 py-3 text-sm font-medium text-white hover:bg-gray-700 active:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving ? "保存中..." : "保存修改"}
            </button>
          ) : confirmDelete ? (
            <div className="space-y-2">
              <p className="text-sm text-center text-gray-600">
                确定要删除「{ingredient.name}」吗？此操作不可撤销。
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-medium text-white hover:bg-red-500 active:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? "删除中..." : "确认删除"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full rounded-xl border border-red-200 py-3 text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
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
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm ${valueClass ?? "text-gray-900"}`}>
        {value}
      </span>
    </div>
  );
}
