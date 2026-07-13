import type { FatLossTargets } from "../types";

export const DEFAULT_MEAL_CALORIES_MIN = 500;
export const DEFAULT_MEAL_CALORIES_MAX = 600;
const DEFAULT_MEAL_PROTEIN_G = 30;

/**
 * 减脂模式的 prompt 约束块，recipe-generation 和 chat-recipe 共用。
 * 约束通过 prompt 文字施加（软约束），schema 不强制——见 AGENTS.md。
 * format: "json" 时点名 nutritionEstimate 字段（结构化输出），
 *         "markdown" 时只要求营养估算行（纯文本输出）。
 */
export function buildFatLossBlock(
  targets: FatLossTargets | undefined,
  format: "json" | "markdown" = "json",
): string {
  if (!targets?.enabled) return "";

  const min = targets.mealCaloriesMin ?? DEFAULT_MEAL_CALORIES_MIN;
  const max = targets.mealCaloriesMax ?? DEFAULT_MEAL_CALORIES_MAX;
  const mealProtein = targets.dailyProteinTargetG
    ? Math.max(DEFAULT_MEAL_PROTEIN_G, Math.round(targets.dailyProteinTargetG / 3))
    : DEFAULT_MEAL_PROTEIN_G;

  const lines = [
    "### 减脂模式（硬约束，优先级最高）",
    "用户正在减脂期，每道菜必须同时满足：",
    `1. 热量控制：单人份 ${min}–${max} kcal（多人份按比例放大，但营养估算按单人份给出）`,
    `2. 高蛋白：单人份蛋白质 ≥ ${mealProtein}g，优先选用鸡胸、去皮鸡腿、瘦牛肉、鱼虾、蛋、豆腐等优质蛋白`,
    "3. 严格控油：每道菜用油 ≤ 1瓷勺（15ml）；烹饪方式优先 蒸/煮/炖/空气炸 > 快炒，禁止油炸、禁止勾芡、不加糖或用代糖",
    format === "json"
      ? "4. 必须输出营养估算 nutritionEstimate（calories、proteinG、carbsG、fatG，按单人份估算），绝对不能省略——用户靠它记录每日摄入"
      : "4. 必须输出营养估算行（热量 kcal、蛋白质 g、碳水 g、脂肪 g，按单人份估算），绝对不能省略——用户靠它记录每日摄入",
    "5. 保证饱腹感：搭配足量蔬菜（每餐建议 200g 以上），避免「吃不饱的减肥餐」",
  ];

  if (targets.dailyCalorieTarget || targets.dailyProteinTargetG) {
    const parts: string[] = [];
    if (targets.dailyCalorieTarget) parts.push(`${targets.dailyCalorieTarget} kcal`);
    if (targets.dailyProteinTargetG) parts.push(`蛋白质 ${targets.dailyProteinTargetG}g`);
    lines.push(`6. 用户每日总目标：${parts.join("、")}，单餐推荐时为其余餐次留出额度`);
  }

  return lines.join("\n");
}
