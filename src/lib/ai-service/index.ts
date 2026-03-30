import { generateObject, streamText } from "ai";
import { createLanguageModelProvider, resolveProviderConfig } from "./registry";
import {
  RecipeSchema,
  IngredientInfoSchema,
  type AIService,
  type AIProviderConfig,
  type RecipeGenerationInput,
  type IngredientAnalysisInput,
} from "./types";
import { buildRecipePrompt } from "./prompts/recipe-generation";
import { buildIngredientPrompt } from "./prompts/ingredient-analysis";

export function createAIService(overrides?: Partial<AIProviderConfig>): AIService {
  const config = resolveProviderConfig(overrides);
  const model = createLanguageModelProvider(config);

  return {
    async generateRecipe(input: RecipeGenerationInput) {
      const { object } = await generateObject({
        model,
        schema: RecipeSchema,
        prompt: buildRecipePrompt(input),
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: config.maxTokens ?? 4096,
      });
      return object;
    },

    async streamRecipe(input: RecipeGenerationInput) {
      const result = streamText({
        model,
        prompt: buildRecipePrompt(input),
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: config.maxTokens ?? 4096,
      });
      return result.textStream as unknown as ReadableStream<string>;
    },

    async analyzeIngredient(input: IngredientAnalysisInput) {
      const { object } = await generateObject({
        model,
        schema: IngredientInfoSchema,
        prompt: buildIngredientPrompt(input),
        temperature: 0.3,
      });
      return object;
    },

    getProvider() {
      return config.id;
    },
  };
}

let defaultService: AIService | null = null;

export function getAIService(): AIService {
  if (!defaultService) {
    defaultService = createAIService();
  }
  return defaultService;
}

export type { AIService, AIProviderID, AIProviderConfig, Recipe, IngredientInfo } from "./types";
