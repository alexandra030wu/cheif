"use client";

import { memo, useMemo } from "react";

type TimeOfDay = "morning" | "noon" | "evening" | "latenight";

interface Props {
  onSelect: (text: string) => void;
}

interface PromptCard {
  emoji: string;
  text: string;
  timeOnly?: TimeOfDay[];
}

const PROMPTS: PromptCard[] = [
  { emoji: "🌅", text: "来点早餐灵感", timeOnly: ["morning"] },
  { emoji: "☀️", text: "来点午餐灵感", timeOnly: ["noon"] },
  { emoji: "🌙", text: "来点晚餐灵感", timeOnly: ["evening"] },
  { emoji: "🦉", text: "来点夜宵", timeOnly: ["latenight"] },
  { emoji: "🎲", text: "惊喜菜谱" },
  { emoji: "🔥", text: "HOT 热门菜" },
  { emoji: "💪", text: "健身餐" },
  { emoji: "⚡", text: "快手10分钟" },
];

function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 15) return "noon";
  if (h >= 15 && h < 21) return "evening";
  return "latenight";
}

export const PromptCards = memo(function PromptCards({ onSelect }: Props) {
  const timeOfDay = useMemo(getTimeOfDay, []);

  const visible = PROMPTS.filter(
    (p) => !p.timeOnly || p.timeOnly.includes(timeOfDay)
  );

  return (
    <div className="px-4">
      <p className="text-[11px] text-ink-muted mb-3 text-center">试试这些：</p>
      <div className="flex flex-wrap justify-center gap-2">
        {visible.map((card) => (
          <button
            key={card.text}
            type="button"
            onClick={() => onSelect(card.text)}
            className="inline-flex items-center gap-1.5 rounded-full border border-pebble/60 bg-surface/70 px-4 py-2.5 text-[12px] font-medium text-ink-soft hover:bg-surface hover:border-ink/30 active:bg-surface-dim transition-colors shadow-soft"
          >
            <span>{card.emoji}</span>
            <span>{card.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
});
