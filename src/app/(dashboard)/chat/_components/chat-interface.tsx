"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Recipe } from "@/lib/ai-service";
import { useChatStore } from "@/stores/chat-store";
import { PromptCards } from "./prompt-cards";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { RecipeDetailSheet } from "./recipe-detail-sheet";

type TimeOfDay = "morning" | "noon" | "evening" | "latenight";

interface Ingredient {
  id: string;
  name: string;
  category: string;
  quantity: number | null;
  unit: string | null;
  expiry_date: string | null;
}

interface UserPreferences {
  nickname?: string;
  dietary_preferences?: string[];
  allergies?: string[];
  cooking_level?: string;
  kitchen_equipment?: string[];
  default_servings?: string;
  fat_loss_mode?: boolean;
  daily_calorie_target?: number;
  daily_protein_target_g?: number;
}

interface TasteProfile {
  liked_dishes: string[];
  disliked_dishes: string[];
  liked_cuisines: string[];
  disliked_cuisines: string[];
  liked_ingredients: string[];
  disliked_ingredients: string[];
  liked_flavors: string[];
  disliked_flavors: string[];
  cooking_styles: string[];
  dietary_goals: string[];
  signal_count: number;
  last_updated: string;
}

interface Props {
  ingredients: Ingredient[];
  userPreferences?: UserPreferences;
  tasteProfile?: TasteProfile;
}

function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 15) return "noon";
  if (h >= 15 && h < 21) return "evening";
  return "latenight";
}

export function ChatInterface({ ingredients, userPreferences, tasteProfile }: Props) {
  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);
  const clearMessages = useChatStore((s) => s.clearMessages);

  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatIngredients = useMemo(() => {
    const now = Date.now();
    const msPerDay = 86400000;
    return ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      daysUntilExpiry: i.expiry_date
        ? Math.floor((new Date(i.expiry_date).getTime() - now) / msPerDay)
        : null,
    }));
  }, [ingredients]);


  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  // Scroll to bottom when messages change (including restore from localStorage)
  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "instant",
        });
      });
    }
  }, [messages.length]);

  const updateMessage = useChatStore((s) => s.updateMessage);

  // Backfill covers for any recipe missing coverImageUrl — covers messages persisted
  // from before the streaming-cover feature landed, or recipes whose SSE cover event
  // was dropped. Deduped per-title via a ref to avoid repeat fetches on rerender.
  const inFlightCovers = useRef<Set<string>>(new Set());
  useEffect(() => {
    messages.forEach((msg) => {
      if (msg.role !== "assistant" || !msg.recipes) return;
      msg.recipes.forEach((r, idx) => {
        if (r.coverImageUrl || inFlightCovers.current.has(r.title)) return;
        inFlightCovers.current.add(r.title);
        fetch("/api/recipes/cover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: r.title }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            const url = data?.coverImageUrl;
            if (!url) return;
            updateMessage(msg.id, (m) => {
              if (!m.recipes) return {};
              const target = m.recipes[idx];
              if (!target || target.title !== r.title) return {};
              const next = m.recipes.slice();
              next[idx] = { ...target, coverImageUrl: url };
              return { recipes: next };
            });
          })
          .catch(() => {})
          .finally(() => {
            inFlightCovers.current.delete(r.title);
          });
      });
    });
  }, [messages, updateMessage]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      addMessage({ role: "user", content: text.trim() });
      setInputValue("");
      setIsLoading(true);
      scrollToBottom();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            ingredients: chatIngredients,
            timeOfDay: getTimeOfDay(),
            preferences: userPreferences,
            tasteProfile,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const errText =
            typeof data?.error === "string" ? data.error : "生成失败，请重试";
          addMessage({ role: "assistant", content: errText });
          return;
        }

        // Create empty assistant message, then stream into it
        const msgId = addMessage({ role: "assistant", content: "" });
        let fullReply = "";

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6);
            if (payload === "[DONE]") continue;

            try {
              const event = JSON.parse(payload);
              if (event.type === "text") {
                fullReply += event.content;
                updateMessage(msgId, () => ({ content: fullReply }));
                scrollToBottom();
              } else if (event.type === "recipes") {
                updateMessage(msgId, () => ({ recipes: event.recipes }));
                scrollToBottom();
              } else if (event.type === "cover") {
                // Cover image arrived for a specific recipe — merge into existing array
                updateMessage(msgId, (m) => {
                  if (!m.recipes) return {};
                  const idx: number = event.index;
                  const target = m.recipes[idx];
                  if (!target || target.title !== event.title) return {};
                  const next = m.recipes.slice();
                  next[idx] = { ...target, coverImageUrl: event.coverImageUrl };
                  return { recipes: next };
                });
              } else if (event.type === "error") {
                updateMessage(msgId, () => ({
                  content: fullReply || event.message || "生成失败，请重试",
                }));
              }
            } catch {
              // skip malformed events
            }
          }
        }

        // Fire-and-forget: extract taste signals from this exchange
        if (fullReply) {
          const conversation = `用户: ${text.trim()}\n助手: ${fullReply}`;
          void fetch("/api/taste/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversation }),
          }).catch(() => {});
        }
      } catch {
        addMessage({ role: "assistant", content: "网络错误，请重试" });
      } finally {
        setIsLoading(false);
        scrollToBottom();
      }
    },
    [chatIngredients, isLoading, scrollToBottom, userPreferences, addMessage, updateMessage]
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

  // When the store backfills a cover for the currently-open recipe, re-sync so
  // the detail sheet picks up the image without the user having to close/reopen.
  useEffect(() => {
    if (!selectedRecipe || selectedRecipe.coverImageUrl) return;
    for (const msg of messages) {
      const match = msg.recipes?.find(
        (r) => r.title === selectedRecipe.title && r.coverImageUrl
      );
      if (match) {
        setSelectedRecipe(match);
        return;
      }
    }
  }, [messages, selectedRecipe]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-env(safe-area-inset-top,0px))]">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between py-3 border-b border-gray-100 bg-white/95 backdrop-blur-sm pl-12 pr-3">
        <span className="text-base font-bold text-gray-900">
          🍳 Cheif
        </span>
        {!isEmpty && (
          <button
            type="button"
            onClick={clearMessages}
            className="rounded-lg px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            清空对话
          </button>
        )}
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
