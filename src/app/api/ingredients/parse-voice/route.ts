import { generateObject } from "ai";
import { createLanguageModelProvider, resolveProviderConfig } from "@/lib/ai-service/registry";
import { createClient } from "@/lib/supabase/server";
import { getUserProviderId } from "@/lib/ai-service/user-provider";
import { z } from "zod";

export const maxDuration = 30;

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
      expiry_date: z.string().optional().describe("保质期到期日，ISO 格式如 2026-04-10"),
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const providerId = await getUserProviderId(supabase, user?.id);
  const config = resolveProviderConfig({ id: providerId });
  const model = createLanguageModelProvider(config);

  const today = new Date().toISOString().slice(0, 10);

  try {
    const { object } = await generateObject({
      model,
      schema: VoiceActionSchema,
      temperature: 0.2,
      prompt: `你是食材识别助手。用户正在用语音添加食材到冰箱。今天是 ${today}。

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
- 如果听不清或不是食材相关内容，返回空 actions

保质期规则（expiry_date 字段，ISO 日期格式）：
- 用户明确说了日期（"保质期到4月10号"/"到下周三"/"7天"）→ 解析为具体日期
- 用户没说保质期 → 根据食材分类自动估算，从今天起算：
  - 鸡蛋: +14天, 鲜奶/酸奶: +7天, 鲜肉/海鲜: +3天, 蔬菜/水果: +5天
  - 豆腐/豆制品: +3天, 面包: +5天, 干货/调味品/香料: +90天, 冷冻品: +30天
  - 米面粮油: +180天, 其他: +14天
- add 时必须填 expiry_date`,
    });

    return Response.json(object);
  } catch {
    return Response.json({ actions: [] });
  }
}
