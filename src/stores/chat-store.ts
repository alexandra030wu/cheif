import { create } from "zustand";
import type { Recipe } from "@/lib/ai-service";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  recipes?: Recipe[];
  // Server timestamp (ISO). Optional for in-flight client-only msgs that
  // haven't been persisted yet — they get filled in on next hydrate.
  createdAt?: string;
}

interface ChatStore {
  messages: ChatMessage[];
  nextLocalId: number;
  hydrate: (msgs: ChatMessage[]) => void;
  prependMessages: (msgs: ChatMessage[]) => void;
  addMessage: (msg: Omit<ChatMessage, "id">) => string;
  updateMessage: (id: string, updater: (msg: ChatMessage) => Partial<ChatMessage>) => void;
  replaceId: (oldId: string, newId: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>()((set, get) => ({
  messages: [],
  nextLocalId: 1,
  hydrate: (msgs) => set({ messages: msgs }),
  prependMessages: (msgs) =>
    set((s) => {
      // Drop any incoming msg whose id we already have (overlap on re-fetch).
      const have = new Set(s.messages.map((m) => m.id));
      const fresh = msgs.filter((m) => !have.has(m.id));
      return { messages: [...fresh, ...s.messages] };
    }),
  addMessage: (msg) => {
    const id = `local-${get().nextLocalId}`;
    set((s) => ({
      messages: [...s.messages, { ...msg, id }],
      nextLocalId: s.nextLocalId + 1,
    }));
    return id;
  },
  updateMessage: (id, updater) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...updater(m) } : m)),
    })),
  replaceId: (oldId, newId) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === oldId ? { ...m, id: newId } : m)),
    })),
  clearMessages: () => set({ messages: [], nextLocalId: 1 }),
}));
