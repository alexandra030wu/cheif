"use client";

import { memo } from "react";

const CATEGORY_EMOJI: Record<string, string> = {
  vegetable: "🥬",
  fruit: "🍎",
  protein: "🥩",
  dairy: "🧀",
  grain: "🌾",
  spice: "🧂",
  condiment: "🫙",
  other: "📦",
};

interface Props {
  id: string;
  name: string;
  category: string;
  quantity: number | null;
  unit: string | null;
  expiry_date: string | null;
  icon_url: string | null;
  onTap?: () => void;
}

export const IngredientItem = memo(function IngredientItem({
  name,
  category,
  quantity,
  unit,
  expiry_date,
  icon_url,
  onTap,
}: Props) {
  const now = Date.now();
  const expiryTime = expiry_date ? new Date(expiry_date).getTime() : null;
  const isExpired = expiryTime !== null && expiryTime < now;
  const isExpiring3d =
    expiryTime !== null && !isExpired && expiryTime < now + 3 * 86400000;
  const isExpiring7d =
    expiryTime !== null && !isExpired && !isExpiring3d && expiryTime < now + 7 * 86400000;

  const borderColor = isExpired
    ? "border-red-200 bg-red-50/40"
    : isExpiring3d
    ? "border-amber-200 bg-amber-50/40"
    : isExpiring7d
    ? "border-yellow-200 bg-yellow-50/30"
    : "border-gray-100";

  const expiryLabel = isExpired
    ? "已过期"
    : isExpiring3d
    ? "即将过期"
    : isExpiring7d
    ? "临期"
    : null;

  const expiryColor = isExpired
    ? "text-red-500"
    : isExpiring3d
    ? "text-amber-500"
    : isExpiring7d
    ? "text-yellow-600"
    : "";

  return (
    <div
      role={onTap ? "button" : undefined}
      tabIndex={onTap ? 0 : undefined}
      onClick={onTap}
      onKeyDown={onTap ? (e) => { if (e.key === "Enter") onTap(); } : undefined}
      className={`rounded-xl border bg-white p-3 flex flex-col items-center text-center transition-colors ${borderColor} ${
        onTap ? "cursor-pointer active:bg-gray-50 hover:border-gray-200" : ""
      }`}
    >
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
      <p className="text-xs font-medium text-gray-900 truncate w-full leading-tight">
        {name}
      </p>

      {/* Quantity or expiry status */}
      <p className={`text-[10px] mt-0.5 truncate w-full ${expiryLabel ? expiryColor + " font-medium" : "text-gray-400"}`}>
        {expiryLabel
          ? expiryLabel
          : quantity != null
          ? `${quantity}${unit ?? ""}`
          : "\u00A0"}
      </p>
    </div>
  );
});
