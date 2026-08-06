"use client";

import { memo } from "react";
import { CATEGORY_EMOJI } from "./constants";

// DIRECTION-v2 §5.1: expiry-driven UI is hidden in slice 1. Code preserved
// behind this flag so it can be re-enabled or removed later.
const SHOW_EXPIRY_UI = false;

interface Props {
  id: string;
  name: string;
  category: string;
  quantity: number | null;
  unit: string | null;
  expiry_date: string | null;
  icon_url: string | null;
  selected?: boolean;
  selectable?: boolean;
  onTap?: () => void;
}

export const IngredientItem = memo(function IngredientItem({
  name,
  category,
  quantity,
  unit,
  expiry_date,
  icon_url,
  selected,
  selectable,
  onTap,
}: Props) {
  const now = Date.now();
  const expiryTime = expiry_date ? new Date(expiry_date).getTime() : null;
  const isExpired = SHOW_EXPIRY_UI && expiryTime !== null && expiryTime < now;
  const isExpiring3d =
    SHOW_EXPIRY_UI && expiryTime !== null && !isExpired && expiryTime < now + 3 * 86400000;
  const isExpiring7d =
    SHOW_EXPIRY_UI && expiryTime !== null && !isExpired && !isExpiring3d && expiryTime < now + 7 * 86400000;

  const borderColor = selected
    ? "border-ink ring-1 ring-ink"
    : isExpired
    ? "border-danger/30 bg-danger/5"
    : isExpiring3d
    ? "border-warn/40 bg-warn/10"
    : isExpiring7d
    ? "border-warn/20 bg-butter/30"
    : "border-pebble/60";

  const expiryLabel = isExpired
    ? "已过期"
    : isExpiring3d
    ? "即将过期"
    : isExpiring7d
    ? "临期"
    : null;

  const expiryColor = isExpired
    ? "text-danger"
    : isExpiring3d
    ? "text-warn"
    : isExpiring7d
    ? "text-warn"
    : "";

  return (
    <div
      role={onTap ? "button" : undefined}
      tabIndex={onTap ? 0 : undefined}
      onClick={onTap}
      onKeyDown={onTap ? (e) => { if (e.key === "Enter") onTap(); } : undefined}
      className={`relative rounded-xl border bg-surface p-3 flex flex-col items-center text-center transition-all ${borderColor} ${
        onTap ? "cursor-pointer active:bg-surface-dim hover:border-ink/20" : ""
      } ${selected ? "scale-[0.97]" : ""}`}
    >
      {/* Selection checkbox overlay */}
      {selectable && (
        <div className="absolute top-1.5 left-1.5 z-10">
          <span
            className={`flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors ${
              selected
                ? "bg-ink border-ink text-white"
                : "border-pebble bg-white/80"
            }`}
          >
            {selected && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </span>
        </div>
      )}

      {/* Icon */}
      <div className="w-14 h-14 flex items-center justify-center mb-2">
        {icon_url ? (
          <img
            src={icon_url}
            alt={name}
            width={56}
            height={56}
            className="rounded-lg object-cover"
          />
        ) : (
          <span className="text-3xl">
            {CATEGORY_EMOJI[category] ?? "📦"}
          </span>
        )}
      </div>

      {/* Name */}
      <p className="text-[12px] font-medium text-ink truncate w-full leading-tight">
        {name}
      </p>

      {/* Quantity or expiry status */}
      <p className={`text-[10px] mt-0.5 truncate w-full ${expiryLabel ? expiryColor + " font-medium" : "text-ink-muted"}`}>
        {expiryLabel
          ? expiryLabel
          : quantity != null
          ? `${quantity}${unit ?? ""}`
          : "\u00A0"}
      </p>
    </div>
  );
});
