"use client";

import { useEffect, useState } from "react";

interface MonthUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  coverCount: number;
  requestCount: number;
  chatCount: number;
  recipeCount: number;
}

/**
 * 第一阶段「只测量」用的轻量徽章 —— 顶部显示当月总 tokens 数，点击展开一个
 * 小卡片看分类细节（输入/输出 token、对话/菜谱次数、封面张数）。
 * 不收费、不限额、不阻塞主流程，单纯让用户看到自己的消耗。
 */
export function UsageBadge() {
  const [usage, setUsage] = useState<MonthUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/usage/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.month) return;
        setUsage(data.month as MonthUsage);
      })
      .catch(() => {
        /* swallow — 徽章是次要信息，错误不打扰用户 */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !usage) {
    return (
      <button
        type="button"
        disabled
        className="ml-auto rounded-full bg-surface-dim px-2.5 py-1 text-[11px] text-ink-muted"
      >
        ···
      </button>
    );
  }

  const total = usage.inputTokens + usage.outputTokens;

  return (
    <div className="ml-auto relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-surface-dim px-2.5 py-1 text-[11px] text-ink-soft hover:bg-pebble/60 active:bg-pebble transition-colors"
        aria-label="本月用量"
      >
        本月 {formatTokens(total)}
      </button>
      {open && (
        <>
          {/* 点外面关 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-60 rounded-2xl bg-surface border border-pebble shadow-soft-lg p-3 text-[11px] space-y-1.5">
            <div className="font-semibold text-ink pb-1.5 border-b border-pebble/60">
              本月用量
            </div>
            <Row label="输入 tokens" value={usage.inputTokens.toLocaleString()} />
            <Row label="输出 tokens" value={usage.outputTokens.toLocaleString()} />
            <Row label="对话次数" value={String(usage.chatCount)} />
            <Row label="菜谱推荐" value={String(usage.recipeCount)} />
            <Row label="封面图片" value={`${usage.coverCount} 张`} />
            {usage.cacheReadTokens > 0 && (
              <Row
                label="缓存节省"
                highlight
                value={`${(usage.cacheReadTokens * 0.9).toLocaleString(undefined, { maximumFractionDigits: 0 })} tokens`}
              />
            )}
            <div className="pt-1.5 mt-1.5 border-t border-pebble/60 text-[10px] text-ink-muted leading-snug">
              当前免费试用阶段，不限量
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex justify-between items-center ${
        highlight ? "text-ok" : "text-ink-soft"
      }`}
    >
      <span>{label}</span>
      <span
        className={`font-mono ${highlight ? "text-ok font-semibold" : "text-ink"}`}
      >
        {value}
      </span>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
