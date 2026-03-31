"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Recipe, ChatResponse } from "@/lib/ai-service";
import { PromptCards } from "./prompt-cards";
import { MessageBubble, type ChatMessage } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { RecipeDetailSheet } from "./recipe-detail-sheet";

type TimeOfDay = "morning" | "noon" | "evening" | "latenight";

interface Ingredient {
  id: string;
  name: string;
  category: string;
  quantity: number | null;
  unit: string | null;
}

interface Props {
  ingredients: Ingredient[];
}

function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 15) return "noon";
  if (h >= 15 && h < 21) return "evening";
  return "latenight";
}

let msgId = 0;
function nextId() {
  return `msg-${++msgId}`;
}

export function ChatInterface({ ingredients }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ingredientNames = useMemo(
    () => ingredients.map((i) => i.name),
    [ingredients]
  );

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        content: text.trim(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputValue("");
      setIsLoading(true);
      scrollToBottom();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            ingredients: ingredientNames,
            timeOfDay: getTimeOfDay(),
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const errText =
            typeof data?.error === "string" ? data.error : "生成失败，请重试";
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: "assistant", content: errText },
          ]);
          return;
        }

        const data = (await res.json()) as ChatResponse;
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content: data.reply,
            recipes: data.recipes,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "assistant", content: "网络错误，请重试" },
        ]);
      } finally {
        setIsLoading(false);
        scrollToBottom();
      }
    },
    [ingredientNames, isLoading, scrollToBottom]
  );

  const handleSend = useCallback(() => {
    sendMessage(inputValue);
  }, [inputValue, sendMessage]);

  const handlePromptSelect = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage]
  );

  const handleRecipeTap = useCallback((recipe: Recipe) => {
    setSelectedRecipe(recipe);
  }, []);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-center py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] border-b border-gray-100 bg-white/95 backdrop-blur-sm pl-12">
        <span className="text-base font-bold text-gray-900">
          🍳 Cheif
        </span>
      </header>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <div className="text-center mb-8">
              <p className="text-4xl mb-3">🍳</p>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                想吃点什么？
              </h2>
              <p className="text-sm text-gray-400">
                {ingredients.length > 0
                  ? `已有 ${ingredients.length} 种食材，为你智能推荐`
                  : "告诉我你想吃什么，我来推荐菜谱"}
              </p>
            </div>
            <PromptCards onSelect={handlePromptSelect} />
          </div>
        ) : (
          <div className="py-4 space-y-4 max-w-2xl mx-auto">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onRecipeTap={handleRecipeTap}
              />
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="px-4">
                <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md bg-white border border-gray-100 px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span className="text-xs text-gray-400">正在翻菜谱...</span>
                </div>
              </div>
            )}

            {/* Spacer for input bar */}
            <div className="h-16" />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        disabled={isLoading}
      />

      {/* Recipe detail sheet */}
      <RecipeDetailSheet
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
      />
    </div>
  );
}
