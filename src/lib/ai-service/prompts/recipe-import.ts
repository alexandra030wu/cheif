// Prompts for extracting structured recipes from external sources (screenshots,
// pasted captions). The Zod schema has all fields optional — this prompt tells
// the LLM to fill ONLY what's directly present and leave the rest blank.

const SHARED_RULES = `你是一个菜谱结构化助手。用户会给你一张菜谱截图或一段菜谱文字，你需要把里面的信息整理成结构化的 JSON。

**核心原则：只填入文中/图中能直接看到的内容，其他一律省略（omit 这个字段，不要输出 key）。不要瞎编、不要推断、不要补齐。**

**严禁使用的占位值**（会让整条数据作废）：
- ❌ "<UNKNOWN>" / "unknown" / "未知" / "N/A" / "无" / "-"
- ❌ 空字符串 "" 或 null
- ✅ 正确做法：**整个字段不出现在 JSON 里**（schema 全 optional，省略即可）

具体规则：
1. 【标题】如有明确菜名就填，否则留空
2. 【描述】仅在原文有简介/开场白时填写，不要用菜名重复一遍
3. 【菜系】仅当可直接判断（如"川菜版鱼香肉丝"→中式；"意式 Carbonara"→意式）才填，否则留空
4. 【份数】原文明确写了"2 人份"才填；没写留空
5. 【准备时间/烹饪时间】文中明确提到数字和单位才填（如"腌 10 分钟"→ prepTimeMinutes: 10；"炒 5 分钟"→ cookTimeMinutes: 5）；模糊表述（"一会儿"、"适量时间"）一律留空
6. 【难度】只有文中出现"新手""小白""简单"→easy；"需要技巧""有挑战"→hard；"进阶""中等"→medium；没暗示就留空
7. 【食材】
   - name 必填，其他尽量拆分
   - "300克鸡胸肉" → name:"鸡胸肉", amount:"300", unit:"克"
   - "鸡蛋 2 个" → name:"鸡蛋", amount:"2", unit:"个"
   - "盐适量" → name:"盐", amount:"适量"（unit 留空）
   - "蒜末少许" → name:"蒜", amount:"少许", notes:"切末"
   - 分组标题（如"腌料："）不作为独立食材，把下面的食材 notes 里注明"腌料"
8. 【步骤】
   - 按原文顺序给 order（从 1 开始）
   - instruction 就是那一步的操作描述，保留关键动词和感官指标
   - 只有明确写了"煮 15 分钟"这类才填 durationSeconds（15×60=900）
   - 原文里的小贴士/易错点可以放进 tip，没有就别编
9. 【标签】能从原文直接看出的风味/场景标签才加（如"辣"、"快手"、"下饭"）；不要硬凑

**绝对禁止**：编造营养数据、编造不存在的步骤、把"看起来可能是"的东西当成事实。拿不准就留空，让用户自己补。

输出严格遵循 schema，不要多加字段，不要解释。`;

export function buildImageExtractionPrompt(): string {
  return `${SHARED_RULES}

输入是一张菜谱截图（来自小红书、抖音、微信、食谱网站等）。请仔细读图里的所有可见文字（包括标题、配图说明、步骤、评论区若可见），按规则提取。
注意识别中文 OCR 可能出现的相近字（如"克"和"颗"），读不准的字段就留空。`;
}

export function buildTextExtractionPrompt(text: string): string {
  return `${SHARED_RULES}

输入是一段用户从抖音/小红书/微信复制过来的文字：

---
${text}
---

请按规则提取菜谱结构。文字里可能夹着 emoji、hashtag、"点赞关注"等噪声，忽略这些。`;
}
