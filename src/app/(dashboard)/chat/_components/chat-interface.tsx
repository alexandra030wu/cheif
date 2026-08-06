"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from "react";
import type { Recipe } from "@/lib/ai-service";
import { useChatStore, type ChatMessage } from "@/stores/chat-store";
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
  initialMessages?: ChatMessage[];
}

function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 15) return "noon";
  if (h >= 15 && h < 21) return "evening";
  return "latenight";
}

export function ChatInterface({ ingredients, userPreferences, tasteProfile, initialMessages }: Props) {
  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);
  const hydrate = useChatStore((s) => s.hydrate);
  const prependMessages = useChatStore((s) => s.prependMessages);
  const replaceId = useChatStore((s) => s.replaceId);

  // Hydrate from server on mount. Re-fires only if initialMessages identity
  // changes (e.g. router.refresh after delete). Empty array hydrates an empty
  // store, which is the right behavior for a brand-new user.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    hydrate(initialMessages ?? []);
  }, [initialMessages, hydrate]);

  // Pagination state for "load older messages" on scroll-to-top.
  const [olderExhausted, setOlderExhausted] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

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
          body: JSON.stringify({
            title: r.title,
            coverImageDescription: r.coverImageDescription,
          }),
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

  // ── Food-note extractor: debounced session-end flush ──────────────────
  // Buffers user/assistant exchanges and POSTs them to /api/food-notes/extract
  // when the conversation has been idle for FOOD_NOTE_DEBOUNCE_MS. Also flushes
  // on page unload so a closed tab doesn't drop the last few turns.
  const FOOD_NOTE_DEBOUNCE_MS = 30_000;
  const pendingExchangesRef = useRef<Array<{ user: string; assistant: string }>>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushFoodNotes = useCallback((useBeacon = false) => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    const exchanges = pendingExchangesRef.current;
    if (exchanges.length === 0) return;
    pendingExchangesRef.current = [];

    const conversation = exchanges
      .map((e) => `用户: ${e.user}\n助手: ${e.assistant}`)
      .join("\n\n");
    const body = JSON.stringify({ conversation });

    if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      try {
        navigator.sendBeacon(
          "/api/food-notes/extract",
          new Blob([body], { type: "application/json" })
        );
        return;
      } catch {
        // fall through to fetch
      }
    }
    void fetch("/api/food-notes/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }, []);

  const scheduleFoodNoteFlush = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => flushFoodNotes(false), FOOD_NOTE_DEBOUNCE_MS);
  }, [flushFoodNotes]);

  // Flush on tab close / hide so the last exchanges aren't lost.
  useEffect(() => {
    const onBeforeUnload = () => flushFoodNotes(true);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushFoodNotes(true);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibility);
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, [flushFoodNotes]);

  // Fire-and-forget DB persist for a chat message. On success, swap the local
  // id for the DB id so subsequent updates (e.g. cover backfill) target the
  // canonical row and pagination dedup keeps working.
  const persistMessage = useCallback(
    (localId: string, role: "user" | "assistant", content: string, recipes?: Recipe[]) => {
      void fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, content, recipes: recipes ?? null }),
        keepalive: true,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const dbId = data?.message?.id;
          if (dbId) replaceId(localId, dbId);
        })
        .catch(() => {
          // Silent — we still have the message in local store; user-visible
          // bubble keeps rendering. Worst case it disappears on next reload.
          console.error("[messages] persist failed for", localId);
        });
    },
    [replaceId]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userText = text.trim();
      const userLocalId = addMessage({ role: "user", content: userText });
      persistMessage(userLocalId, "user", userText);
      setInputValue("");
      setIsLoading(true);
      scrollToBottom();

      // Snapshot the most recent up-to-20 messages as conversation history.
      // We grab from the store directly (not the closed-over `messages` ref)
      // so the user message we just added isn't included as a duplicate.
      const HISTORY_LIMIT = 20;
      const allMsgs = useChatStore.getState().messages;
      // Strip the just-added user message (last entry) and trim down.
      const priorMsgs = allMsgs.slice(0, -1).slice(-HISTORY_LIMIT);
      const history = priorMsgs.map((m) => ({
        role: m.role,
        // Skip recipe payload — the LLM only needs textual context. Include
        // an inline note if recipes were attached so it knows context exists.
        content: m.content + (m.recipes && m.recipes.length > 0
          ? `\n\n[已展示 ${m.recipes.length} 道菜谱卡片：${m.recipes.map((r) => r.title).join("、")}]`
          : ""),
      }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            ingredients: chatIngredients,
            timeOfDay: getTimeOfDay(),
            history,
            preferences: userPreferences,
            tasteProfile,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const rawErr = data?.error;
          const baseErr =
            typeof rawErr === "string"
              ? rawErr
              : rawErr
                ? JSON.stringify(rawErr)
                : `生成失败（HTTP ${res.status}），请重试`;
          const reqId = typeof data?.requestId === "string" ? data.requestId : null;
          const errText = reqId ? `${baseErr}\n(ID: ${reqId})` : baseErr;
          addMessage({ role: "assistant", content: errText });
          return;
        }

        // Create empty assistant message, then stream into it
        const msgId = addMessage({ role: "assistant", content: "" });
        let fullReply = "";
        let finalRecipes: Recipe[] | undefined;

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
                finalRecipes = event.recipes as Recipe[];
                updateMessage(msgId, () => ({ recipes: finalRecipes }));
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
                  finalRecipes = next;
                  return { recipes: next };
                });
              } else if (event.type === "error") {
                const base =
                  fullReply || event.message || "生成失败，请重试";
                const reqId =
                  typeof event.requestId === "string" ? event.requestId : null;
                updateMessage(msgId, () => ({
                  content: reqId && !fullReply ? `${base}\n(ID: ${reqId})` : base,
                }));
              }
            } catch {
              // skip malformed events
            }
          }
        }

        // Server already persisted the assistant message during the stream
        // (so it survives mid-stream navigation). We don't re-POST it here.
        if (fullReply) {
          // Fire-and-forget: extract taste signals from this exchange
          const conversation = `用户: ${userText}\n助手: ${fullReply}`;
          void fetch("/api/taste/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversation }),
          }).catch(() => {});

          // Buffer this exchange for the food-note extractor. Flush on a 30s
          // debounce so the LLM gets a coherent multi-turn slice instead of
          // single Q/A pairs (DIRECTION-v2 §6.3 — quality over recency).
          pendingExchangesRef.current.push({ user: userText, assistant: fullReply });
          scheduleFoodNoteFlush();
        }
      } catch {
        addMessage({ role: "assistant", content: "网络错误，请重试" });
      } finally {
        setIsLoading(false);
        scrollToBottom();
      }
    },
    [chatIngredients, isLoading, scrollToBottom, userPreferences, tasteProfile, addMessage, updateMessage, persistMessage, scheduleFoodNoteFlush]
  );

  const handleSend = useCallback(() => {
    sendMessage(inputValue);
  }, [inputValue, sendMessage]);

  // Load older messages when the user scrolls near the top.
  const loadOlder = useCallback(async () => {
    if (loadingOlder || olderExhausted) return;
    const oldest = messages[0];
    const before = oldest?.createdAt;
    if (!before) {
      // No createdAt means we only have local-only messages; nothing to fetch.
      setOlderExhausted(true);
      return;
    }
    setLoadingOlder(true);
    try {
      const res = await fetch(`/api/messages?before=${encodeURIComponent(before)}&limit=50`);
      if (!res.ok) return;
      const data = await res.json();
      const raw = (data?.messages ?? []) as Array<{
        id: string;
        role: "user" | "assistant";
        content: string;
        recipes: unknown;
        created_at: string;
      }>;
      if (raw.length === 0) {
        setOlderExhausted(true);
        return;
      }
      const older: ChatMessage[] = raw.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        recipes: Array.isArray(m.recipes) ? (m.recipes as Recipe[]) : undefined,
        createdAt: m.created_at,
      }));
      // Preserve scroll position: read scrollHeight before, then offset after.
      const el = scrollRef.current;
      const prevScrollHeight = el?.scrollHeight ?? 0;
      prependMessages(older);
      requestAnimationFrame(() => {
        const newScrollHeight = el?.scrollHeight ?? 0;
        if (el) el.scrollTop = newScrollHeight - prevScrollHeight;
      });
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, olderExhausted, messages, prependMessages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onScroll() {
      if (!el) return;
      if (el.scrollTop < 80) loadOlder();
    }
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [loadOlder]);

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

  // Group messages by local-day so we can drop a date divider between groups.
  // Messages without createdAt (local-only, in-flight) attach to the latest
  // group so they don't break sorting.
  const dayGroups = useMemo(() => {
    const groups: Array<{ day: string; label: string; items: ChatMessage[] }> = [];
    const fmt = new Intl.DateTimeFormat("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
    const todayKey = (() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.toDateString();
    })();
    for (const m of messages) {
      const date = m.createdAt ? new Date(m.createdAt) : new Date();
      const key = date.toDateString();
      const last = groups[groups.length - 1];
      if (last && last.day === key) {
        last.items.push(m);
      } else {
        const label = key === todayKey ? "今天" : fmt.format(date);
        groups.push({ day: key, label, items: [m] });
      }
    }
    return groups;
  }, [messages]);

  return (
    // 桌面端:滚动容器铺满整个窗口(fixed inset-0),内容列在里面居中 —
    // 这样文字能一路滚到窗口顶,穿过顶栏渐变层渐隐(而不是在列顶被硬裁),
    // 滚动条也落在窗口最右缘。顶栏 z-40 盖在本层之上。
    <div className="flex flex-col h-[calc(100vh-env(safe-area-inset-top,0px))] md:fixed md:inset-0 md:h-auto">
      {/* Header */}
      {/* 移动端:玻璃标题条;桌面端:顶栏胶囊已代劳,这里只留右上角用量徽章 */}
      <header className="md:hidden shrink-0 flex items-center py-3 border-b border-pebble/50 glass-frost pl-12 pr-3">
        <span className="text-base font-logo text-ink">蛋厨</span>
      </header>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {/* 桌面响应式:消息流与输入条同宽居中(max-w-2xl)。
            pt-16 在内容里(随滚动移出),给顶栏胶囊让出初始位置 */}
        <div className="mx-auto w-full max-w-2xl md:pt-16">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full px-6">
            <p className="text-base text-ink-muted font-light">
              今天聊点什么？
            </p>
          </div>
        ) : (
          <div className="py-4 space-y-4 max-w-2xl mx-auto">
            {/* Visible affordance for loading older messages — pull-to-load
                isn't discoverable on its own. */}
            {!olderExhausted && (
              <div className="flex justify-center py-2">
                <button
                  type="button"
                  onClick={loadOlder}
                  disabled={loadingOlder}
                  className="text-xs text-ink-muted hover:text-ink px-3 py-1.5 rounded-full border border-pebble/60 bg-surface/70 disabled:opacity-50 transition"
                >
                  {loadingOlder ? "加载中…" : "↑ 加载更早消息"}
                </button>
              </div>
            )}
            {olderExhausted && messages.length > 0 && (
              <div className="text-center text-[10px] uppercase tracking-wider text-ink-muted/60 py-2 select-none">
                已经是最早一条
              </div>
            )}
            {dayGroups.map((group) => (
              <Fragment key={group.day}>
                <div className="text-center text-[10px] uppercase tracking-wider text-ink-muted/60 my-3 select-none">
                  {group.label}
                </div>
                {group.items.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    onRecipeTap={handleRecipeTap}
                  />
                ))}
              </Fragment>
            ))}

            {/* Loading indicator — only show before the first stream chunk
                arrives. Once the assistant bubble has text, the bubble itself
                is the indicator; a second row of dots looks like duplication. */}
            {isLoading &&
              !(
                messages[messages.length - 1]?.role === "assistant" &&
                (messages[messages.length - 1]?.content?.length ?? 0) > 0
              ) && (
                <div className="px-4">
                  <div className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md bg-surface px-4 py-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}

            {/* Spacer for input bar */}
            <div className="h-16" />
          </div>
        )}
      </div></div>

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
