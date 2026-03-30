"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { addIngredient, type AddIngredientState } from "../actions";

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
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-0 transition-colors";

const labelClass = "block text-sm font-medium text-gray-700 mb-1";

const initialState: AddIngredientState = { status: "idle" };

export function AddIngredientForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(addIngredient, initialState);

  useEffect(() => {
    if (state.status === "success") router.push("/kitchen");
  }, [state, router]);

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;
  const message = state.status === "error" ? state.message : undefined;

  return (
    <form action={action} className="space-y-5">
      {message && (
        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
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
          <p className="mt-1 text-xs text-red-500">{fieldErrors.name[0]}</p>
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
          <p className="mt-1 text-xs text-red-500">{fieldErrors.category[0]}</p>
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
          className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {pending ? "保存中…" : "保存食材"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          取消
        </button>
      </div>
    </form>
  );
}
