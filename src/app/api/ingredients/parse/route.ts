import { generateObject } from "ai";
import { createLanguageModelProvider, resolveProviderConfig } from "@/lib/ai-service/registry";
import { z } from "zod";

const ParsedIngredientListSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().describe("食材名称"),
      quantity: z.number().optional().describe("数量，纯数字"),
      unit: z.string().optional().describe("单位，如 克、个、袋、颗、斤等"),
      category: z
        .enum(["vegetable", "fruit", "protein", "dairy", "grain", "spice", "condiment", "other"])
        .describe("分类"),
    })
  ),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!text) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }

  const config = resolveProviderConfig();
  const model = createLanguageModelProvider(config);

  const { object } = await generateObject({
    model,
    schema: ParsedIngredientListSchema,
    temperature: 0.2,
    prompt: `你是一个厨房助手。请从下面这段自然语言中提取所有食材信息，解析出每个食材的名称、数量、单位和分类。
分类只能是以下之一：vegetable（蔬菜）、fruit（水果）、protein（蛋白质/肉/蛋/豆）、dairy（乳制品）、grain（谷物/主食）、spice（香料）、condiment（调味品）、other（其他）。
如果某个字段无法确定，则省略它。

用户输入：
${text}`,
  });

  return Response.json(object);
}
