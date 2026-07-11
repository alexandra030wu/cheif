import { z } from "zod";
import { ImportedRecipeSchema, type ChatRecipeInput } from "../types";

// ── 定稿成卡(crystallize):从收敛的对话中提取"聊定的那一道菜" ──
//
// 与 recipe-intent 路径的区别:recipe-intent 是关键词触发、即刻生成 2-3 道
// "猜你想要"的菜;crystallize 是对话已经聊出共识后,把双方确认的最终配方
// (含聊天中敲定的所有细节:食材替换、焯水、冷冻香蕉这类处理方式)忠实
// 提取成一张卡。是提取,不是创作。
//
// schema 遵循 CLAUDE.md:LLM 输出字段全部 optional,复用 ImportedRecipeSchema
// (自带 placeholder 字符串清洗),路由层用 normalizeImportedRecipe 补默认值。

export const CrystallizeResultSchema = z.object({
  consensusReached: z.boolean().optional(),
  recipe: ImportedRecipeSchema.optional(),
});

export type CrystallizeResult = z.infer<typeof CrystallizeResultSchema>;

// 共识信号预过滤:用户消息或 assistant 回复出现明确定稿语气时才值得花
// 一次 generateObject。宁可漏(用户可以再补一句"就这么定了"触发)不可滥
// (每条闲聊都跑提取,又贵又容易出幻觉卡片)。
//
// 两侧都要扫:实测中用户说「就这个方案了」,助手只回「好嘞!期待你的
// 反馈」—— 用户亲口确认是最强的共识信号,只扫助手会漏。

// 助手侧:复述定稿的句式
export const CONSENSUS_SIGNAL =
  /最终配方|就这么定|就照这个|定稿|最终版本[:：]?|那就做这/;

// 用户侧:亲口拍板的句式
export const USER_CONSENSUS_SIGNAL =
  /就这么定|就这个方案|就这个了|就做这个|就它了|就选这个|就按这个|就喝这个|就吃这个|好就这个|可以就这/;

export function buildCrystallizePrompt(
  input: ChatRecipeInput,
  assistantReply: string
): {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
} {
  const system = `你是一个菜谱提取器。下面是一段用户和烹饪助手的对话,对话可能已经就"做哪道菜、怎么做"达成了共识。

## 你的任务
1. 判断对话是否已就**一道具体的菜/饮品**达成明确共识(用户确认过,或助手说了"就这么定了/最终配方"且用户没有反对)。
2. 若达成共识:把这道菜提取成结构化菜谱。**忠实于对话内容**:
   - 对话中敲定的所有细节必须保留(如"羽衣甘蓝先焯水"、"用冷冻香蕉代替冰块"、"抹茶粉小半茶匙")
   - 对话中排除的选项不要出现(如聊过可可粉但最终选了抹茶,配方里就不能有可可粉)
   - 对话没提到的常规步骤可以合理补全(如清洗、器具),但不要发明对话之外的关键食材
3. 若未达成共识(还在讨论、有多个候选、用户没确认):consensusReached 设为 false,不要输出 recipe。

## 输出要求(软约束)
- title:菜名,简洁有食欲(可从对话提炼,如"抹茶羽衣甘蓝冰沙")
- description:1-2 句,可以带一点对话中的场景感
- ingredients:每项含 name/amount/unit,分量按对话或常识
- steps:按操作顺序,含对话中强调的技巧(tip 字段)
- servings/prepTimeMinutes/cookTimeMinutes/difficulty/cuisine/tags:合理估计
- coverImageDescription:**英文**的成品照片描述(一句话,给文生图模型用)。
  描述成品的真实形态和器皿——饮品/冰沙在玻璃杯里、汤在碗里、炒菜在盘里,
  写清主要食材的视觉特征和颜色
- 语言:除 coverImageDescription 外均为中文`;

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...(input.history ?? []),
    { role: "user", content: input.message },
    { role: "assistant", content: assistantReply },
    {
      role: "user",
      content:
        "【系统指令】请根据以上对话判断是否已达成菜谱共识,并按 schema 输出。",
    },
  ];

  return { system, messages };
}
