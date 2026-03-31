"use client";

import { memo } from "react";
import type { Recipe } from "@/lib/ai-service";
import { RecipeCard } from "./recipe-card";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  recipes?: Recipe[];
}

interface Props {
  message: ChatMessage;
  onRecipeTap: (recipe: Recipe) => void;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  onRecipeTap,
}: Props) {
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
      {message.content && (
        <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white border border-gray-100 px-4 py-2.5 text-sm text-gray-800 shadow-sm">
          {message.content}
        </div>
      )}
      {message.recipes && message.recipes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {message.recipes.map((recipe, i) => (
            <RecipeCard key={i} recipe={recipe} onTap={onRecipeTap} />
          ))}
        </div>
      )}
    </div>
  );
});
