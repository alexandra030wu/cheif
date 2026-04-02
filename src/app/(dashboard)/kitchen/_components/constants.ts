export const CATEGORIES = [
  { value: "vegetable", label: "蔬菜" },
  { value: "fruit", label: "水果" },
  { value: "protein", label: "蛋白质（肉/蛋/豆）" },
  { value: "dairy", label: "乳制品" },
  { value: "grain", label: "谷物/主食" },
  { value: "spice", label: "香料" },
  { value: "condiment", label: "调味品" },
  { value: "other", label: "其他" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];

export const CATEGORY_EMOJI: Record<string, string> = {
  vegetable: "🥬",
  fruit: "🍎",
  protein: "🥩",
  dairy: "🧀",
  grain: "🌾",
  spice: "🧂",
  condiment: "🫙",
  other: "📦",
};

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
);
