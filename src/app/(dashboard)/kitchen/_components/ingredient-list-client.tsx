"use client";

import { useCallback, useState } from "react";
import { IngredientItem } from "./ingredient-item";
import { EditIngredientSheet, type EditableIngredient } from "./edit-ingredient-sheet";

interface Props {
  ingredients: EditableIngredient[];
  expiredCount: number;
}

export function IngredientListClient({ ingredients, expiredCount }: Props) {
  const [editing, setEditing] = useState<EditableIngredient | null>(null);
  const handleClose = useCallback(() => setEditing(null), []);

  return (
    <>
      <p className="text-sm text-gray-400 mt-1 mb-4">
        共 {ingredients.length} 种食材
      </p>

      {expiredCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 mb-4">
          <span className="text-lg">⚠️</span>
          <p className="text-sm text-red-700">
            你有 <span className="font-semibold">{expiredCount}</span> 个食材已过期，建议尽快处理
          </p>
        </div>
      )}

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
