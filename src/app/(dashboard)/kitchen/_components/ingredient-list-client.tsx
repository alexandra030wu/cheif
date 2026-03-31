"use client";

import { useCallback, useState } from "react";
import { IngredientItem } from "./ingredient-item";
import { EditIngredientSheet, type EditableIngredient } from "./edit-ingredient-sheet";

interface Props {
  ingredients: EditableIngredient[];
}

export function IngredientListClient({ ingredients }: Props) {
  const [editing, setEditing] = useState<EditableIngredient | null>(null);
  const handleClose = useCallback(() => setEditing(null), []);

  return (
    <>
      <p className="text-sm text-gray-400 mt-1 mb-8">
        共 {ingredients.length} 种食材
      </p>
      <div className="space-y-2">
        {ingredients.map((item) => (
          <IngredientItem
            key={item.id}
            id={item.id}
            name={item.name}
            category={item.category}
            quantity={item.quantity}
            unit={item.unit}
            expiry_date={item.expiry_date}
            onTap={() => setEditing(item)}
          />
        ))}
      </div>

      <EditIngredientSheet ingredient={editing} onClose={handleClose} />
    </>
  );
}
