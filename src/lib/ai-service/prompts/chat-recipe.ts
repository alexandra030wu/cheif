export interface ChatPromptInput {
  message: string;
  ingredients: string[];
  timeOfDay: "morning" | "noon" | "evening" | "latenight";
}

const TIME_LABELS: Record<string, string> = {
  morning: "早晨",
  noon: "中午",
  evening: "傍晚",
  latenight: "深夜",
};

export function buildChatRecipePrompt(input: ChatPromptInput): string {
  const time = TIME_LABELS[input.timeOfDay] ?? "现在";
  const hasIngredients = input.ingredients.length > 0;

  const parts = [
    "你是 Cheif，一位热情友好的中文家庭厨师助手。",
    "",
    `现在是${time}，用户说：「${input.message}」`,
    "",
  ];

  if (hasIngredients) {
    parts.push(
      `用户冰箱里有以下食材：${input.ingredients.join("、")}。`,
      "",
      "请根据以上食材推荐 2-3 道菜。规则：",
      "1. 只从用户的食材库中选取，每道菜选取合理搭配的食材，不需要全部用上。",
      "2. 可以假设用户家中有基本调料（盐、酱油、醋、食用油等）。",
      "3. 默认 1 人份。",
      "4. 根据时段推荐合适的菜品（早餐、午餐、晚餐、夜宵）。",
    );
  } else {
    parts.push(
      "用户还没有录入食材。请推荐 2-3 道常见家常菜，并建议用户去食材库添加食材以获得更精准的推荐。",
    );
  }

  parts.push(
    "",
    "在 reply 字段中用简短友好的中文回复用户（1-2 句话），然后在 recipes 数组中给出结构化菜谱。",
    "每道菜谱必须包含完整的食材清单（含用量）和详细的分步骤说明。",
  );

  return parts.join("\n");
}
