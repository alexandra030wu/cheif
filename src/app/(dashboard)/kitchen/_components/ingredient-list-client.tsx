"use client";

import { useCallback, useMemo, useState } from "react";
import { IngredientItem } from "./ingredient-item";
import { EditIngredientSheet, type EditableIngredient } from "./edit-ingredient-sheet";
import { batchDeleteIngredients } from "../actions";

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
        <p className="text-sm text-gray-400">
          共 {ingredients.length} 种食材
        </p>
        {ingredients.length > 0 && (
          <button
            type="button"
            onClick={batchMode ? exitBatchMode : () => setBatchMode(true)}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            {batchMode ? "取消" : "管理"}
          </button>
        )}
      </div>

      {expiredCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 mb-4">
          <span className="text-lg">⚠️</span>
          <p className="text-sm text-red-700">
            你有 <span className="font-semibold">{expiredCount}</span> 个食材已过期，建议尽快处理
          </p>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
            clipRule="evenodd"
          />
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
          className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none transition-colors"
        />
      </div>

      {/* Category filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3 -mx-1 px-1 scrollbar-hide">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setCategoryFilter(cat.value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              categoryFilter === cat.value
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
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
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-sm">
            {search || categoryFilter !== "all"
              ? "没有找到匹配的食材"
              : "暂无食材"}
          </p>
          {(search || categoryFilter !== "all") && (
            <button
              type="button"
              onClick={() => { setSearch(""); setCategoryFilter("all"); }}
              className="mt-2 text-sm text-gray-900 underline underline-offset-2"
            >
              清除筛选
            </button>
          )}
        </div>
      )}

      {/* Batch mode bottom bar */}
      {batchMode && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              {allSelected ? "取消全选" : `全选 (${filtered.length})`}
            </button>

            <span className="text-sm text-gray-400">
              已选 {selectedIds.size} 个
            </span>

            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  确定删除 {selectedIds.size} 个？
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleBatchDelete}
                  disabled={deleting}
                  className="rounded-lg px-3 py-1.5 text-xs text-white bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? "删除中..." : "确认删除"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
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
