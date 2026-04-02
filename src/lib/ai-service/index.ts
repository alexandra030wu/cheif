import { generateObject, streamText } from "ai";
import { createLanguageModelProvider, resolveProviderConfig } from "./registry";
import {
  RecipeSchema,
  IngredientInfoSchema,
  ChatResponseSchema,
  type AIService,
  type AIProviderConfig,
  type RecipeGenerationInput,
  type IngredientAnalysisInput,
  type ChatRecipeInput,
} from "./types";
import { buildRecipePrompt } from "./prompts/recipe-generation";
import { buildIngredientPrompt } from "./prompts/ingredient-analysis";
import { buildChatRecipePrompt } from "./prompts/chat-recipe";

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

    async generateChatRecipes(input: ChatRecipeInput) {
      const { object } = await generateObject({
        model,
        schema: ChatResponseSchema,
        prompt: buildChatRecipePrompt(input),
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: config.maxTokens ?? 4096,
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

export type { AIService, AIProviderID, AIProviderConfig, Recipe, IngredientInfo, ChatResponse, ChatRecipeInput, ChatIngredient } from "./types";
