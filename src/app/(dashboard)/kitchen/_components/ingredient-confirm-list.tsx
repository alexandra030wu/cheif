"use client";

import Link from "next/link";
import { CATEGORIES, type Category } from "./constants";

export interface ConfirmItem {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  category: string;
  expiry_date?: string;
  checked: boolean;
}

interface Props {
  items: ConfirmItem[];
  onUpdate: (id: string, updates: Partial<ConfirmItem>) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  onSave: () => void;
  saving: boolean;
  savedCount: number;
  loading?: boolean;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 md:px-2 md:py-1.5 text-base md:text-sm text-gray-900 focus:border-gray-400 focus:outline-none transition-colors";

export function IngredientConfirmList({
  items,
  onUpdate,
  onRemove,
  onToggle,
  onSave,
  saving,
  savedCount,
  loading,
}: Props) {
  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      {items.length > 0 && (
        <p className="text-sm font-medium text-gray-700">
          已识别 {items.length} 种食材
        </p>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          识别中...
        </div>
      )}

      {/* Item list — mobile cards */}
      {items.length > 0 && (
        <div className="space-y-2 md:hidden">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-lg border bg-white p-3 flex items-start gap-3 transition-opacity ${
                item.checked ? "border-gray-100" : "border-gray-100 opacity-50"
              }`}
            >
              {/* Checkbox */}
              <button
                type="button"
                onClick={() => onToggle(item.id)}
                className="mt-0.5 shrink-0"
              >
                <span
                  className={`flex items-center justify-center w-5 h-5 rounded border transition-colors ${
                    item.checked
                      ? "bg-gray-900 border-gray-900 text-white"
                      : "border-gray-300 text-transparent"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                  </svg>
                </span>
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-2">
                <input
                  value={item.name}
                  onChange={(e) => onUpdate(item.id, { name: e.target.value })}
                  className={inputClass}
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={item.quantity ?? ""}
                    onChange={(e) =>
                      onUpdate(item.id, {
                        quantity: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="数量"
                    className={inputClass}
                  />
                  <input
                    value={item.unit ?? ""}
                    onChange={(e) =>
                      onUpdate(item.id, { unit: e.target.value || undefined })
                    }
                    placeholder="单位"
                    className={inputClass}
                  />
                  <select
                    value={item.category}
                    onChange={(e) =>
                      onUpdate(item.id, { category: e.target.value as Category })
                    }
                    className={inputClass}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 shrink-0">到期</span>
                  <input
                    type="date"
                    value={item.expiry_date ?? ""}
                    onChange={(e) =>
                      onUpdate(item.id, { expiry_date: e.target.value || undefined })
                    }
                    className={inputClass + " text-xs"}
                  />
                </div>
              </div>

              {/* Delete */}
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="shrink-0 mt-0.5 p-1 text-gray-300 hover:text-red-400 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                  <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Item list — desktop table */}
      {items.length > 0 && (
        <div className="hidden md:block rounded-lg border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-2 py-2 w-8" />
                <th className="px-2 py-2 text-left font-medium text-gray-500 text-xs">名称</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 text-xs w-20">数量</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 text-xs w-20">单位</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 text-xs w-28">分类</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 text-xs w-32">到期日</th>
                <th className="px-2 py-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={`bg-white hover:bg-gray-50/50 ${item.checked ? "" : "opacity-50"}`}
                >
                  <td className="px-2 py-1.5 text-center">
                    <button type="button" onClick={() => onToggle(item.id)}>
                      <span
                        className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${
                          item.checked
                            ? "bg-gray-900 border-gray-900 text-white"
                            : "border-gray-300"
                        }`}
                      >
                        {item.checked && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                            <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                    </button>
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={item.name} onChange={(e) => onUpdate(item.id, { name: e.target.value })} className={inputClass} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number" min="0" step="any"
                      value={item.quantity ?? ""}
                      onChange={(e) => onUpdate(item.id, { quantity: e.target.value ? Number(e.target.value) : undefined })}
                      className={inputClass}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={item.unit ?? ""}
                      onChange={(e) => onUpdate(item.id, { unit: e.target.value || undefined })}
                      className={inputClass}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={item.category}
                      onChange={(e) => onUpdate(item.id, { category: e.target.value as Category })}
                      className={inputClass}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="date"
                      value={item.expiry_date ?? ""}
                      onChange={(e) => onUpdate(item.id, { expiry_date: e.target.value || undefined })}
                      className={inputClass}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <button type="button" onClick={() => onRemove(item.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                      &times;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Save + status */}
      {items.length > 0 && (
        <button
          type="button"
          onClick={onSave}
          disabled={saving || checkedCount === 0}
          className="w-full rounded-xl bg-gray-900 py-3 text-sm font-medium text-white hover:bg-gray-700 active:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {saving ? "入库中..." : `全部入库 (${checkedCount})`}
        </button>
      )}

      {savedCount > 0 && (
        <p className="text-center text-sm text-gray-400">
          已添加 {savedCount} 个 ·{" "}
          <Link href="/kitchen" className="text-gray-900 underline underline-offset-2">
            查看食材库
          </Link>
        </p>
      )}
    </div>
  );
}
