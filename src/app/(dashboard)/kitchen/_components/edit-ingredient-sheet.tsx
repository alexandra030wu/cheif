"use client";

import { useEffect, useState } from "react";
import { updateIngredient } from "../actions";

const CATEGORIES = [
  { value: "vegetable", label: "蔬菜" },
  { value: "fruit", label: "水果" },
  { value: "protein", label: "蛋白质（肉/蛋/豆）" },
  { value: "dairy", label: "乳制品" },
  { value: "grain", label: "谷物/主食" },
  { value: "spice", label: "香料" },
  { value: "condiment", label: "调味品" },
  { value: "other", label: "其他" },
];

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 md:py-2 text-base md:text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none transition-colors";

const labelClass = "block text-sm font-medium text-gray-700 mb-1";

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

export function EditIngredientSheet({ ingredient, onClose }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("other");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [saving, setSaving] = useState(false);
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
    }
  }, [ingredient]);

  // Lock body scroll
  useEffect(() => {
    if (ingredient) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [ingredient]);

  if (!ingredient) return null;

  async function handleSave() {
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

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">编辑食材</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div>
            <label className={labelClass}>食材名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>分类</label>
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
              <label className={labelClass}>数量</label>
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
              <label className={labelClass}>单位</label>
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
            <label className={labelClass}>保质期至</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-full rounded-xl bg-gray-900 py-3 text-sm font-medium text-white hover:bg-gray-700 active:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "保存中..." : "保存修改"}
          </button>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    </div>
  );
}
