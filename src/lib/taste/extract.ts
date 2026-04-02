import { generateObject } from "ai";
import { createLanguageModelProvider, resolveProviderConfig } from "@/lib/ai-service/registry";
import { TasteExtractionSchema, type TasteSignal } from "./types";

const EXTRACTION_PROMPT = `分析以下用户与厨房助手的对话，提取用户的口味偏好信号。

对话内容：
{conversation}

请提取用户表达的长期口味偏好。每个信号包含：
- signal_type: 类型
- signal_value: 具体内容
- confidence: 置信度 0-1
  - 1.0: 用户明确说了（"我喜欢吃辣"、"我不吃香菜"）
  - 0.8: 用户强烈暗示（"再来点辣的！"）
  - 0.5: 推断（用户连续要了多道同类菜）
- context: 原文片段（≤50字）

规则：
- 只提取有明确证据的信号，不要过度推断
- "我想吃面"不是偏好信号（只是当下需求）
- "我一直很喜欢吃面"是偏好信号
- "今天想吃清淡的"不是长期偏好
- "我平时吃得比较清淡"是长期偏好
- 如果没有任何口味信号，返回空 signals 数组`;

/**
 * Use a cheap model to extract taste signals from a conversation.
 * Returns empty array on failure (non-blocking, best-effort).
 */
export async function extractTasteSignals(
  conversation: string,
): Promise<TasteSignal[]> {
  try {
    const config = resolveProviderConfig();

    // Use a cheaper/faster model for extraction
    const cheapModel: Record<string, string> = {
      openai: "gpt-4o-mini",
      anthropic: "claude-haiku-4-5-20251001",
      ollama: config.model, // use whatever is configured
    };

    const model = createLanguageModelProvider({
      ...config,
      model: cheapModel[config.id] ?? config.model,
    });

    const { object } = await generateObject({
      model,
      schema: TasteExtractionSchema,
      prompt: EXTRACTION_PROMPT.replace("{conversation}", conversation),
      temperature: 0.3,
      maxOutputTokens: 500,
    });

    return object.signals;
  } catch {
    // Extraction is best-effort, never fail the main flow
    console.error("[taste] extraction failed, skipping");
    return [];
  }
}
