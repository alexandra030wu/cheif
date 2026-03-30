import { create } from "zustand";
import type { Recipe } from "@/lib/ai-service";

interface RecipeStore {
  generatedRecipe: Recipe | null;
  savedRecipes: Recipe[];
  isGenerating: boolean;
  setGeneratedRecipe: (recipe: Recipe | null) => void;
  setSavedRecipes: (recipes: Recipe[]) => void;
  setIsGenerating: (value: boolean) => void;
}

export const useRecipeStore = create<RecipeStore>((set) => ({
  generatedRecipe: null,
  savedRecipes: [],
  isGenerating: false,
  setGeneratedRecipe: (recipe) => set({ generatedRecipe: recipe }),
  setSavedRecipes: (recipes) => set({ savedRecipes: recipes }),
  setIsGenerating: (value) => set({ isGenerating: value }),
}));
