"use client";

import { memo } from "react";
import type { Recipe } from "@/lib/ai-service";
import type { ChatMessage } from "@/stores/chat-store";
import { RecipeCard } from "./recipe-card";

export type { ChatMessage };

interface Props {
  message: ChatMessage;
  onRecipeTap: (recipe: Recipe) => void;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  onRecipeTap,
}: Props) {
  const hasContent =
    typeof message.content === "string" && message.content.trim().length > 0;
  const hasRecipes = !!(message.recipes && message.recipes.length > 0);

  // 渲染层防御：脏数据兜底，空 content 且无 recipes 的消息直接不渲染。
  // 避免聊天页留着一串空气泡。
  if (!hasContent && !hasRecipes) return null;

  if (message.role === "user") {
    return (
      <div className="flex justify-end px-4">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-gray-900 px-4 py-2.5 text-sm text-white">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-3">
      {hasContent && (
        <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white border border-gray-100 px-4 py-2.5 text-sm text-gray-800 shadow-sm">
          {message.content}
        </div>
      )}
      {hasRecipes && (
        <div
          className={
            message.recipes!.length === 1
              ? "max-w-sm" // 定稿单卡:全宽大卡,不挤进半列
              : "grid grid-cols-1 md:grid-cols-2 gap-2.5"
          }
        >
          {message.recipes!.map((recipe, i) => (
            <RecipeCard key={i} recipe={recipe} onTap={onRecipeTap} />
          ))}
        </div>
      )}
    </div>
  );
});
