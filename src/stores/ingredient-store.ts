import { create } from "zustand";
import type { Database } from "@/lib/supabase/types";

type Ingredient = Database["public"]["Tables"]["ingredients"]["Row"];

interface IngredientStore {
  ingredients: Ingredient[];
  setIngredients: (ingredients: Ingredient[]) => void;
  addIngredient: (ingredient: Ingredient) => void;
  removeIngredient: (id: string) => void;
  updateIngredient: (id: string, updates: Partial<Ingredient>) => void;
}

export const useIngredientStore = create<IngredientStore>((set) => ({
  ingredients: [],
  setIngredients: (ingredients) => set({ ingredients }),
  addIngredient: (ingredient) =>
    set((state) => ({ ingredients: [...state.ingredients, ingredient] })),
  removeIngredient: (id) =>
    set((state) => ({
      ingredients: state.ingredients.filter((i) => i.id !== id),
    })),
  updateIngredient: (id, updates) =>
    set((state) => ({
      ingredients: state.ingredients.map((i) =>
        i.id === id ? { ...i, ...updates } : i
      ),
    })),
}));
