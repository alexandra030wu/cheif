"use client";

import { useCallback, useMemo, useState } from "react";
import { IngredientItem } from "./ingredient-item";
import { EditIngredientSheet, type EditableIngredient } from "./edit-ingredient-sheet";
import { batchDeleteIngredients } from "../actions";

// DIRECTION-v2 §5.1: expiry-driven UI hidden in slice 1.
const SHOW_EXPIRY_UI = false;

const CATEGORY_FILTERS = [
  { value: "all", label: "全部" },
  { value: "vegetable", label: "蔬菜" },
  { value: "fruit", label: "水果" },
  { value: "protein", label: "蛋白质" },
  { value: "dairy", label: "乳制品" },
  { value: "grain", label: "谷物" },
  { value: "spice", label: "香料" },
  { value: "condiment", label: "调味品" },
  { value: "other", label: "其他" },
];

interface Props {
  ingredients: EditableIngredient[];
  expiredCount: number;
}

export function IngredientListClient({ ingredients, expiredCount }: Props) {
  const [editing, setEditing] = useState<EditableIngredient | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const handleClose = useCallback(() => setEditing(null), []);

  // Batch management state
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    let list = ingredients;
    if (categoryFilter !== "all") {
      list = list.filter((i) => i.category === categoryFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    return list;
  }, [ingredients, search, categoryFilter]);

  const exitBatchMode = useCallback(() => {
    setBatchMode(false);
    setSelectedIds(new Set());
    setConfirmDelete(false);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === filtered.length) return new Set();
      return new Set(filtered.map((i) => i.id));
    });
  }, [filtered]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    await batchDeleteIngredients([...selectedIds]);
    setDeleting(false);
    exitBatchMode();
  }, [selectedIds, exitBatchMode]);

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  return (
    <>
      {/* Subheader: count + manage button */}
      <div className="flex items-center justify-between mt-1 mb-4">
        <p className="text-[11px] text-ink-muted">
          共 {ingredients.length} 种食材
        </p>
        {ingredients.length > 0 && (
          <button
            type="button"
            onClick={batchMode ? exitBatchMode : () => setBatchMode(true)}
            className="text-[11px] text-ink-muted hover:text-ink-soft transition-colors"
          >
            {batchMode ? "取消" : "管理"}
          </button>
        )}
      </div>

      {SHOW_EXPIRY_UI && expiredCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-butter/60 px-4 py-3 mb-4">
          <span className="text-lg">⚠️</span>
          <p className="text-[12px] text-warn">
            你有 <span className="font-semibold">{expiredCount}</span> 个食材已过期，建议尽快处理
          </p>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-3">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          autoComplete="off"
          name="ingredient-search"
          role="searchbox"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
          suppressHydrationWarning
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索食材..."
          className="w-full rounded-xl border border-pebble bg-pebble/30 pl-9 pr-3 py-2.5 text-[12.5px] text-ink placeholder-ink-muted focus:border-ink/30 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-ink/20 transition-colors"
        />
      </div>

      {/* Category filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3 -mx-1 px-1 scrollbar-hide">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setCategoryFilter(cat.value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[10.5px] font-medium border transition-colors ${
              categoryFilter === cat.value
                ? "bg-ink text-white border-ink"
                : "bg-white/70 border-pebble/60 text-ink-muted hover:border-ink/30"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
          {filtered.map((item) => (
            <IngredientItem
              key={item.id}
              id={item.id}
              name={item.name}
              category={item.category}
              quantity={item.quantity}
              unit={item.unit}
              expiry_date={item.expiry_date}
              icon_url={item.icon_url}
              selectable={batchMode}
              selected={selectedIds.has(item.id)}
              onTap={batchMode ? () => toggleSelect(item.id) : () => setEditing(item)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-ink-muted">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-[12px]">
            {search || categoryFilter !== "all"
              ? "没有找到匹配的食材"
              : "暂无食材"}
          </p>
          {(search || categoryFilter !== "all") && (
            <button
              type="button"
              onClick={() => { setSearch(""); setCategoryFilter("all"); }}
              className="mt-2 text-[12px] text-ink underline underline-offset-2"
            >
              清除筛选
            </button>
          )}
        </div>
      )}

      {/* Batch mode bottom bar */}
      {batchMode && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-surface border-t border-pebble/60 shadow-soft-lg">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-[12px] text-ink-soft hover:text-ink transition-colors"
            >
              {allSelected ? "取消全选" : `全选 (${filtered.length})`}
            </button>

            <span className="text-[12px] text-ink-muted">
              已选 {selectedIds.size} 个
            </span>

            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-ink-soft">
                  确定删除 {selectedIds.size} 个？
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg px-3 py-1.5 text-[11px] text-ink-soft border border-pebble/60 hover:bg-surface-dim transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleBatchDelete}
                  disabled={deleting}
                  className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-danger bg-danger/10 hover:bg-danger/20 active:bg-danger/25 disabled:opacity-50 transition-colors"
                >
                  {deleting ? "删除中..." : "确认删除"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] text-danger hover:bg-danger/10 active:bg-danger/15 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M3 6h18" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                删除
              </button>
            )}
          </div>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      )}

      {/* Spacer when batch bar is visible */}
      {batchMode && <div className="h-20" />}

      <EditIngredientSheet ingredient={editing} onClose={handleClose} />
    </>
  );
}
