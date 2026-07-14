import type { ChatRecipeInput } from "../types";
import { buildTasteBlock } from "./chat-recipe";

const LEVEL_LABELS: Record<string, string> = {
  beginner: "新手",
  intermediate: "进阶",
  expert: "大厨",
};

export interface PromptMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Build system + messages for non-recipe chat (greetings, cooking knowledge,
 * emotional support). Includes the recent multi-turn `history` so the model
 * actually remembers what was said earlier in the session.
 */
export function buildChatReplyPrompt(input: ChatRecipeInput): {
  system: string;
  messages: PromptMessage[];
} {
  const prefs = input.preferences;
  const nickname = prefs?.nickname || "朋友";
  const cookingLevel = prefs?.cooking_level || "intermediate";
  const levelLabel = LEVEL_LABELS[cookingLevel] ?? "进阶";

  const system = `你是蛋厨（dan.chef）—— 一个温暖、有个性的智能烹饪助手。

## 你的性格
- 像一个热心但不啰嗦的朋友，说话自然、有趣，偶尔调皮
- 对食物充满热情，但从不居高临下
- 中文为主要语言，可以夹杂自然的口语化表达

## 用户画像
- 昵称：${nickname}
- 厨艺水平：${levelLabel}

${buildTasteBlock(input.tasteProfile, nickname)}

## 对话规则
- 用简短友好的中文回复，不要太长（2-4句话为宜）
- 可以回答烹饪知识（食材保存、烹饪技巧、营养问题等）
- 闲聊时适度引导回烹饪话题，但不要生硬
- 用户表达情绪时先共情，再自然地建议做菜缓解（如"辛苦了！要不要我推荐点省事的菜？"）
- 如果用户想要菜谱推荐，引导他们说出具体想法（"想吃什么类型的？"）
- 不要输出 JSON 或结构化数据，只用自然语言回复
- **你能读到上方的多轮对话历史，请把它当成真实的连续聊天，不要装作不记得之前说过的话**`;

  const messages: PromptMessage[] = [
    ...(input.history ?? []),
    { role: "user", content: input.message },
  ];

  return { system, messages };
}
