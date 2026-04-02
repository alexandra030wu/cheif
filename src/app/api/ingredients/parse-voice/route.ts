import { generateObject } from "ai";
import { createLanguageModelProvider, resolveProviderConfig } from "@/lib/ai-service/registry";
import { z } from "zod";

const VoiceActionSchema = z.object({
  actions: z.array(
    z.object({
      type: z.enum(["add", "update", "remove"]),
      name: z.string().describe("食材名称"),
      quantity: z.number().optional().describe("数量"),
      unit: z.string().optional().describe("单位"),
      category: z
        .enum(["vegetable", "fruit", "protein", "dairy", "grain", "spice", "condiment", "other"])
        .optional()
        .describe("分类，add 时必填"),
      matchName: z.string().optional().describe("update/remove 时匹配的现有食材名称"),
    })
  ),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const transcript = typeof body?.transcript === "string" ? body.transcript.trim() : "";

  if (!transcript) {
    return Response.json({ actions: [] });
  }

  const currentItems: Array<{ name: string; quantity?: number; unit?: string }> =
    Array.isArray(body?.currentItems) ? body.currentItems : [];

  const currentListStr =
    currentItems.length > 0
      ? currentItems.map((i) => `${i.name}${i.quantity ? ` ${i.quantity}` : ""}${i.unit ?? ""}`).join("、")
      : "（空）";

  const config = resolveProviderConfig();
  const model = createLanguageModelProvider(config);

  try {
    const { object } = await generateObject({
      model,
      schema: VoiceActionSchema,
      temperature: 0.2,
      prompt: `你是食材识别助手。用户正在用语音添加食材到冰箱。

当前已识别的食材列表：${currentListStr}

用户刚刚说的话："${transcript}"

请分析用户的意图并返回操作列表。

规则：
- "鸡蛋三个" → type: "add"，新增食材
- "鸡蛋改成五个" 或 "鸡蛋多拿了两个" → type: "update"，matchName 填已有食材的名称
- "牛奶不要了" 或 "去掉牛奶" 或 "算了不加牛奶" → type: "remove"，matchName 填已有食材的名称
- 一句话可能包含多个操作
- add 时必须填 category（vegetable/fruit/protein/dairy/grain/spice/condiment/other）
- update/remove 时 matchName 必须是当前列表中已有的食材名称
- 如果听不清或不是食材相关内容，返回空 actions`,
    });

    return Response.json(object);
  } catch {
    return Response.json({ actions: [] });
  }
}
