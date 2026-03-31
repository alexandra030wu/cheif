"use client";

import { memo } from "react";
import { DeleteButton } from "./delete-button";

const CATEGORY_LABELS: Record<string, string> = {
  vegetable: "蔬菜",
  fruit: "水果",
  protein: "蛋白质",
  dairy: "乳制品",
  grain: "谷物",
  spice: "香料",
  condiment: "调味品",
  other: "其他",
};

const CATEGORY_COLORS: Record<string, string> = {
  vegetable: "bg-green-50 text-green-700",
  fruit: "bg-orange-50 text-orange-700",
  protein: "bg-red-50 text-red-700",
  dairy: "bg-blue-50 text-blue-700",
  grain: "bg-yellow-50 text-yellow-700",
  spice: "bg-purple-50 text-purple-700",
  condiment: "bg-pink-50 text-pink-700",
  other: "bg-gray-100 text-gray-600",
};

interface Props {
  id: string;
  name: string;
  category: string;
  quantity: number | null;
  unit: string | null;
  expiry_date: string | null;
  onTap?: () => void;
}

export const IngredientItem = memo(function IngredientItem({
  id,
  name,
  category,
  quantity,
  unit,
  expiry_date,
  onTap,
}: Props) {
  const isExpired = expiry_date ? new Date(expiry_date) < new Date() : false;
  const isExpiringSoon =
    expiry_date && !isExpired
      ? new Date(expiry_date) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      : false;

  return (
    <div
      role={onTap ? "button" : undefined}
      tabIndex={onTap ? 0 : undefined}
      onClick={onTap}
      onKeyDown={onTap ? (e) => { if (e.key === "Enter") onTap(); } : undefined}
      className={`flex items-center gap-3 md:gap-4 rounded-xl border border-gray-100 bg-white px-4 py-3.5 md:px-5 md:py-4 hover:border-gray-200 transition-colors ${onTap ? "cursor-pointer active:bg-gray-50" : ""}`}
    >
      <span
        className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${
          CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other
        }`}
      >
        {CATEGORY_LABELS[category] ?? category}
      </span>

      <span className="flex-1 text-sm font-medium text-gray-900">{name}</span>

      {quantity != null && (
        <span className="text-sm text-gray-400">
          {quantity} {unit ?? ""}
        </span>
      )}

      {expiry_date && (
        <span
          className={`text-xs ${
            isExpired
              ? "text-red-500"
              : isExpiringSoon
              ? "text-amber-500"
              : "text-gray-400"
          }`}
        >
          {isExpired ? "已过期 " : ""}
          {expiry_date}
        </span>
      )}

      <span onClick={(e) => e.stopPropagation()}>
        <DeleteButton id={id} />
      </span>
    </div>
  );
});
