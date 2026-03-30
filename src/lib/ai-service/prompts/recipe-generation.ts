import type { RecipeGenerationInput } from "../types";

export function buildRecipePrompt(input: RecipeGenerationInput): string {
  const parts = [
    `Generate a recipe using these available ingredients: ${input.ingredients.join(", ")}.`,
  ];
  if (input.cuisine) parts.push(`Cuisine style: ${input.cuisine}.`);
  if (input.dietaryRestrictions?.length) {
    parts.push(`Dietary restrictions: ${input.dietaryRestrictions.join(", ")}.`);
  }
  if (input.servings) parts.push(`Servings: ${input.servings}.`);
  if (input.maxCookingTime) {
    parts.push(`Maximum total cooking time: ${input.maxCookingTime} minutes.`);
  }
  if (input.difficulty) parts.push(`Difficulty level: ${input.difficulty}.`);
  if (input.freeformNotes) parts.push(`Additional notes: ${input.freeformNotes}`);

  return parts.join("\n");
}
