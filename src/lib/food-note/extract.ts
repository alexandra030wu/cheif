import { generateObject } from "ai";
import { createLanguageModelProvider, resolveProviderConfig } from "@/lib/ai-service/registry";
import type { AIProviderID } from "@/lib/ai-service/types";
import { normalizeIngredientName } from "@/lib/icon-generation";
import { FoodNoteExtractionSchema, type FoodNoteCandidate } from "./types";

const EXTRACTION_PROMPT = `你的任务：从下面的对话中识别**用户正在主动研究 / 询问 / 尝试做的那一道成品食物**，并产出可以追加进笔记的要点。

对话内容：
{conversation}

# 核心定义：什么是「食物」？

**food_name 必须是一道端上桌就能直接吃喝的成品**——菜、饮品、主食、小吃、点心：
- ✅ 豆浆、馒头、麻婆豆腐、炒面、拉面、煎饺、卤蛋、凉拌黄瓜、红烧肉、小笼包
- ❌ **绝不允许**用单独的原始食材作为 food_name（这些**只能**进 ingredient_tags）：
  - **豆类**：黄豆 / 黑豆 / 红豆 / 绿豆 / 蚕豆 / 毛豆
  - **米谷**：大米 / 糯米 / 黑米 / 燕麦 / 小米 / 玉米
  - **面粉淀粉**：面粉 / 玉米淀粉
  - **调味料**：盐 / 糖 / 生抽 / 老抽 / 醋 / 料酒 / 蚝油 / 豆瓣酱
  - **油脂**：食用油 / 花生油 / 橄榄油
  - **辛香料**：葱 / 姜 / 蒜 / 花椒 / 八角 / 桂皮
  - **发酵剂**：酵母 / 泡打粉 / 小苏打
  - **基础蛋白**：鸡蛋 / 牛奶（除非有具体做法变成"煮鸡蛋 / 蛋炒饭 / 卡布奇诺"）
- ❌ **品类词**也不行："面食 / 豆制品 / 早餐 / 蔬菜 / 肉类"

判断规则：能直接说"我做了一份 X"、"我喝了一杯 X"、"今天午饭吃了 X" → 是成品；说成"我买了点 X"、"我加了点 X" → 是食材。

# 判断「主焦点食物」的规则

**默认每次对话最多有 1 个主焦点。** 必须从**用户提问 / 描述的对象**判断，不要把 AI 顺手提到的衍生菜或食材当焦点。

例子（必须严格遵守）：
- 用户："最近我在研究豆浆，黄豆要泡多久？"
  AI："黄豆建议泡 8 小时…可以加点黑豆增香"
  → 主焦点 **只有「豆浆」**。**绝不抽** "黄豆" 或 "黑豆"——它们是食材，进 ingredient_tags。
- 用户："今天教我做麻婆豆腐"
  → 主焦点 **只有「麻婆豆腐」**。即使对话整段都在讨论豆腐怎么选，也**不抽** "豆腐"——豆腐是食材。
- 用户："豆浆怎么做？牛奶和豆浆哪个更适合早餐？"
  → 主焦点 **「豆浆」和「牛奶」**（牛奶在这里作为饮品被讨论而非食材）。
- 用户："鸡蛋多少钱一斤啊"
  → **没有焦点**，返回空。鸡蛋是食材且对话没有"做法"内容。

# 输出 schema

每条 note：
- **food_name**：成品名（见上面定义，绝不允许食材）。
- **entry_type**：默认 "food"。仅当对话明显在讨论一种跨多种食物的工艺（出汁 / 发酵 / 熬糖）时才用 "technique"。
- **summary_md**：用户这次对话围绕该食物**新学到 / 新尝试 / 新顿悟**的内容，简洁中文 markdown，≤100 字。
- **ingredient_tags**：本次对话提到的、与该食物相关的所有**食材**名（黄豆 / 黑豆 / 生抽 / 酵母 / 葱 / 姜……）。**这里收纳所有食材**，不要让它们各自变成独立笔记。
- **confidence**：0–1
  - 0.9–1.0：用户**明确**在研究 / 反复做这种食物
  - 0.8：对话主线**明确**围绕该成品的做法 / 经验展开
  - <0.8：不算焦点，**不要抽**

# 严格规则（宁可漏掉，不要乱提取）

1. **食材 ≠ 食物焦点**。任何上面"绝不允许"列表里的词 + 任何用户用"加点 X / 买点 X / X 多少钱 / X 好不好"语气提到的东西 → 进 ingredient_tags，**不进** notes。
2. **AI 的衍生提议 ≠ 焦点**。除非用户接住继续追问，否则不抽。
3. **品类 ≠ 焦点**。
4. **"今天想吃 X" / "来点 X" 不是焦点**。
5. **summary 没有实质内容 → 不抽**。
6. 没有任何符合标准的成品 → 返回 \`{ "notes": [] }\`。`;

const CONFIDENCE_THRESHOLD = 0.8;

// Code-level guard: even with the strongest prompt, LLMs sometimes return raw
// ingredients as food_name. Reject anything matching this list outright.
// Keep this list to *unambiguous* raw ingredients — items that are never a
// finished dish on their own. (Don't add things like "黄瓜" because "凉拌黄瓜"
// is a real dish, but the LLM should output the dish name, not the ingredient.)
const RAW_INGREDIENT_BLACKLIST = new Set([
  // 豆类原料
  "黄豆", "黑豆", "红豆", "绿豆", "白豆", "蚕豆", "豌豆", "毛豆",
  // 米谷类（生）
  "大米", "糯米", "黑米", "薏米", "燕麦", "小米", "玉米", "小麦",
  // 粉类
  "面粉", "高筋面粉", "低筋面粉", "全麦粉", "玉米淀粉", "土豆淀粉", "红薯淀粉",
  // 调味料
  "盐", "糖", "白糖", "冰糖", "酱油", "生抽", "老抽", "醋", "陈醋", "白醋",
  "料酒", "黄酒", "蚝油", "豆瓣酱", "黄豆酱", "甜面酱", "番茄酱", "鱼露", "味精", "鸡精",
  // 油脂
  "食用油", "花生油", "橄榄油", "猪油", "菜籽油", "芝麻油", "麻油", "葵花籽油",
  // 香辛料
  "葱", "小葱", "姜", "蒜", "大蒜", "花椒", "八角", "桂皮", "香叶", "茴香",
  "辣椒粉", "胡椒粉", "孜然", "孜然粉", "五香粉", "十三香",
  // 发酵剂
  "酵母", "干酵母", "泡打粉", "小苏打", "酒曲", "醪糟",
  // 基础原料蛋奶
  "鸡蛋", "鸭蛋", "鹅蛋", "牛奶", "纯牛奶", "酸奶",
  // 食材品类
  "豆类", "豆制品", "面食", "蔬菜", "肉类", "水果", "海鲜", "早餐", "午餐", "晚餐",
]);

/**
 * Use a cheap model to extract food-focused notes from a conversation.
 * Returns empty array on failure (non-blocking, best-effort) — mirrors taste/extract.
 */
export async function extractFoodNotes(
  conversation: string,
  providerId?: AIProviderID,
): Promise<FoodNoteCandidate[]> {
  try {
    const config = resolveProviderConfig(providerId ? { id: providerId } : undefined);

    const cheapModel: Record<string, string> = {
      openai: "gpt-4o-mini",
      anthropic: "claude-haiku-4-5-20251001",
      deepseek: "deepseek-v4-flash",
      ollama: config.model,
    };

    const model = createLanguageModelProvider({
      ...config,
      model: cheapModel[config.id] ?? config.model,
    });

    const { object } = await generateObject({
      model,
      schema: FoodNoteExtractionSchema,
      prompt: EXTRACTION_PROMPT.replace("{conversation}", conversation),
      temperature: 0.3,
      maxOutputTokens: 1000,
    });

    const notes = object.notes ?? [];

    // Filter + normalize. Drop low-confidence and items missing required fields.
    const candidates: FoodNoteCandidate[] = [];
    for (const item of notes) {
      const name = item.food_name?.trim();
      const summary = item.summary_md?.trim();
      const conf = item.confidence ?? 0;

      if (!name || !summary || conf < CONFIDENCE_THRESHOLD) continue;

      // Hard guard: reject any food_name that is actually a raw ingredient.
      // Even a perfectly worded prompt occasionally leaks ingredients through.
      if (RAW_INGREDIENT_BLACKLIST.has(name)) {
        console.warn(`[food-note] rejected ingredient masquerading as food: "${name}"`);
        continue;
      }

      const normalized = normalizeIngredientName(name);
      if (!normalized) continue;

      candidates.push({
        food_name: name,
        food_name_normalized: normalized,
        entry_type: item.entry_type ?? "food",
        summary_md: summary,
        ingredient_tags: (item.ingredient_tags ?? [])
          .map((t) => t.trim())
          .filter(Boolean),
        confidence: conf,
      });
    }

    return candidates;
  } catch (err) {
    console.error("[food-note] extraction failed:", err instanceof Error ? err.message : err);
    return [];
  }
}
