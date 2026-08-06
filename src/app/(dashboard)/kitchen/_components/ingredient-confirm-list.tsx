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
  "w-full rounded-lg border border-pebble bg-pebble/30 px-2.5 py-2 md:px-2 md:py-1.5 text-base md:text-sm text-ink focus:border-ink/30 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-ink/20 transition-colors";

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
        <p className="text-[12px] font-medium text-ink-soft">
          已识别 {items.length} 种食材
        </p>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center gap-2 text-[12px] text-ink-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-pulse" />
          识别中...
        </div>
      )}

      {/* Item list — mobile cards */}
      {items.length > 0 && (
        <div className="space-y-2 md:hidden">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border bg-surface p-3 flex items-start gap-3 transition-opacity ${
                item.checked ? "border-pebble/60" : "border-pebble/60 opacity-50"
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
                      ? "bg-ink border-ink text-white"
                      : "border-pebble text-transparent"
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                    <path d="M20 6 9 17l-5-5" />
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
                  <span className="text-[11px] text-ink-muted shrink-0">到期</span>
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
                className="shrink-0 mt-0.5 rounded-lg p-1 text-ink-muted hover:text-danger hover:bg-danger/10 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Item list — desktop table */}
      {items.length > 0 && (
        <div className="hidden md:block rounded-xl border border-pebble/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-dim border-b border-pebble/60">
                <th className="px-2 py-2 w-8" />
                <th className="px-2 py-2 text-left font-medium text-ink-muted text-[11px]">名称</th>
                <th className="px-2 py-2 text-left font-medium text-ink-muted text-[11px] w-20">数量</th>
                <th className="px-2 py-2 text-left font-medium text-ink-muted text-[11px] w-20">单位</th>
                <th className="px-2 py-2 text-left font-medium text-ink-muted text-[11px] w-28">分类</th>
                <th className="px-2 py-2 text-left font-medium text-ink-muted text-[11px] w-32">到期日</th>
                <th className="px-2 py-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-pebble/40">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={`bg-surface hover:bg-surface-dim/50 ${item.checked ? "" : "opacity-50"}`}
                >
                  <td className="px-2 py-1.5 text-center">
                    <button type="button" onClick={() => onToggle(item.id)}>
                      <span
                        className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${
                          item.checked
                            ? "bg-ink border-ink text-white"
                            : "border-pebble"
                        }`}
                      >
                        {item.checked && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                            <path d="M20 6 9 17l-5-5" />
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
                    <button type="button" onClick={() => onRemove(item.id)} className="text-ink-muted hover:text-danger transition-colors">
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
          className="w-full rounded-full bg-ink py-3 text-[13px] font-medium text-white hover:bg-ink/90 active:bg-ink/80 disabled:opacity-50 transition-colors"
        >
          {saving ? "入库中..." : `全部入库 (${checkedCount})`}
        </button>
      )}

      {savedCount > 0 && (
        <p className="text-center text-[11px] text-ink-muted">
          已添加 {savedCount} 个 ·{" "}
          <Link href="/kitchen" className="text-ink underline underline-offset-2">
            查看食材库
          </Link>
        </p>
      )}
    </div>
  );
}
