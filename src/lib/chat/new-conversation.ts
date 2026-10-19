import { useChatStore } from "@/stores/chat-store";

export const DIVIDER_CONTENT = "新对话";

/**
 * 手动开新对话:在聊天流末尾插一条分隔线并落库。之后发给模型的历史只取
 * 分隔线之后的消息(见 chat-interface 的 history 构造)。
 * 流为空、或最后一条已经是分隔线时什么都不做,避免连点出一串分隔线。
 */
export function startNewConversation() {
  const { messages, addMessage, replaceId } = useChatStore.getState();
  const last = messages[messages.length - 1];
  if (!last || last.role === "divider") return;

  const localId = addMessage({
    role: "divider",
    content: DIVIDER_CONTENT,
    createdAt: new Date().toISOString(),
  });
  void fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "divider", content: DIVIDER_CONTENT }),
    keepalive: true,
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const dbId = data?.message?.id;
      if (dbId) replaceId(localId, dbId);
    })
    .catch(() => {
      console.error("[messages] persist failed for divider", localId);
    });
}
