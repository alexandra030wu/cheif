import type { IngredientAnalysisInput } from "../types";

export function buildIngredientPrompt(input: IngredientAnalysisInput): string {
  const parts = [`Analyze the following ingredient: ${input.name}.`];
  if (input.description) parts.push(`Additional context: ${input.description}`);
  parts.push(
    "Provide its category, estimated shelf life in days, storage tips, common ingredient pairings, and possible substitutes."
  );
  return parts.join("\n");
}
