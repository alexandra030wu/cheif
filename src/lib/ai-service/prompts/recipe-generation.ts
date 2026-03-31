import type { RecipeGenerationInput } from "../types";

export function buildRecipePrompt(input: RecipeGenerationInput): string {
  const servings = input.servings ?? 1;

  const parts = [
    `你是一位经验丰富的家庭厨师。用户冰箱里有以下食材：${input.ingredients.join("、")}。`,
    "",
    "请根据以下规则推荐菜谱：",
    "1. 不需要把所有食材都用上。根据食材之间的合理搭配，每道菜只选取适量食材。",
    `2. 推荐 2-3 道菜供用户选择。`,
    `3. 默认按 ${servings} 人份设计用量。`,
    "4. 每道菜必须标注【预计烹饪时间】和【难度】（简单/中等/困难）。",
    "",
    "输出格式（每道菜）：",
    "---",
    "### 菜名",
    "⏱ 预计烹饪时间：XX 分钟 | 难度：简单/中等/困难",
    "**所用食材：** ...",
    "**调料：** ...（可假设用户家中有基本调料）",
    "**步骤：**",
    "1. ...",
    "2. ...",
    "---",
  ];

  if (input.cuisine) parts.push(`菜系偏好：${input.cuisine}。`);
  if (input.dietaryRestrictions?.length) {
    parts.push(`饮食限制：${input.dietaryRestrictions.join("、")}。`);
  }
  if (input.maxCookingTime) {
    parts.push(`单道菜最长烹饪时间不超过 ${input.maxCookingTime} 分钟。`);
  }
  if (input.difficulty) {
    const difficultyMap = { easy: "简单", medium: "中等", hard: "困难" };
    parts.push(`难度偏好：${difficultyMap[input.difficulty]}。`);
  }
  if (input.freeformNotes) parts.push(`用户备注：${input.freeformNotes}`);

  return parts.join("\n");
}
