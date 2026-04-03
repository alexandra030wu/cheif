import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Recipe } from "@/lib/ai-service";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  recipes?: Recipe[];
}

interface ChatStore {
  messages: ChatMessage[];
  nextId: number;
  addMessage: (msg: Omit<ChatMessage, "id">) => string;
  updateMessage: (id: string, updater: (msg: ChatMessage) => Partial<ChatMessage>) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      messages: [],
      nextId: 1,
      addMessage: (msg) => {
        const id = `msg-${get().nextId}`;
        set((s) => ({
          messages: [...s.messages, { ...msg, id }],
          nextId: s.nextId + 1,
        }));
        return id;
      },
      updateMessage: (id, updater) =>
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === id ? { ...m, ...updater(m) } : m,
          ),
        })),
      clearMessages: () => set({ messages: [], nextId: 1 }),
    }),
    {
      name: "cheif-chat",
    }
  )
);
